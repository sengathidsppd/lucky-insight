"""Analysis API endpoints (v1)."""

import uuid
from typing import Optional, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_active_user
from app.core.database import get_db
from app.core.logging import get_logger
from app.models.analysis_job import AnalysisJob
from app.models.user import User
from app.repositories.analysis_repository import AnalysisRepository
from app.repositories.exceptions import EntityNotFoundError
from app.repositories.lottery_result_repository import LotteryResultRepository
from app.repositories.number_record_repository import NumberRecordRepository
from app.schemas.analysis import (
    AnalysisJobDetailResponse,
    AnalysisJobListResponse,
    AnalysisJobResponse,
    AnalysisResultResponse,
    CreateAnalysisRequest,
)
from app.services.analysis_service import AnalysisService

logger = get_logger(__name__)
router = APIRouter(prefix="/analysis", tags=["Analysis"])


def get_analysis_service(db: Session = Depends(get_db)) -> AnalysisService:
    """Provide a request-scoped ``AnalysisService``."""
    return AnalysisService(
        AnalysisRepository(db),
        NumberRecordRepository(db),
        LotteryResultRepository(db),
    )


def map_job_to_response(job: AnalysisJob, db: Session, user: Optional[User] = None) -> AnalysisJobResponse:
    """Map AnalysisJob ORM model to Pydantic schema."""
    game_code = "My Records"
    if job.parameters and "game_id" in job.parameters:
        g_id_str = job.parameters["game_id"]
        if g_id_str:
            from app.models.lottery_game import LotteryGame
            try:
                g_id = uuid.UUID(g_id_str)
                game = db.query(LotteryGame).filter(LotteryGame.id == g_id).first()
                if game:
                    game_code = game.code
            except Exception:
                pass

    result_data = None
    if job.result:
        res_dict = job.result.result_data
        if isinstance(res_dict, dict):
            res_dict = res_dict.copy()
            is_superadmin = bool(user and (user.email == "suzu@gmail.com" or getattr(user, "is_superadmin", False)))
            is_operator_admin = bool(user and user.is_admin and not is_superadmin)

            # Redact 3D and 4D recommendations completely
            res_dict.pop("generated_3d_recommendations", None)
            res_dict.pop("generated_4d_recommendations", None)

            if is_superadmin:
                # Super Admin: 1x 6D, 3x 2D (no 4D, no 3D)
                if "best_analyzed_6d" in res_dict and isinstance(res_dict["best_analyzed_6d"], list):
                    res_dict["best_analyzed_6d"] = res_dict["best_analyzed_6d"][:1]
                if "generated_2d_recommendations" in res_dict and isinstance(res_dict["generated_2d_recommendations"], list):
                    res_dict["generated_2d_recommendations"] = res_dict["generated_2d_recommendations"][:3]

            elif is_operator_admin:
                # Operator Admin: 1x 6D (if not Thai), 3x 2D (no 4D, no 3D)
                if "THAI" in game_code.upper():
                    res_dict.pop("best_analyzed_6d", None)
                elif "best_analyzed_6d" in res_dict and isinstance(res_dict["best_analyzed_6d"], list):
                    res_dict["best_analyzed_6d"] = res_dict["best_analyzed_6d"][:1]
                if "generated_2d_recommendations" in res_dict and isinstance(res_dict["generated_2d_recommendations"], list):
                    res_dict["generated_2d_recommendations"] = res_dict["generated_2d_recommendations"][:3]

            elif user and not user.is_admin:
                # Regular User: 3x 2D (no 6D, no 4D, no 3D)
                res_dict.pop("best_analyzed_6d", None)
                if "generated_2d_recommendations" in res_dict and isinstance(res_dict["generated_2d_recommendations"], list):
                    res_dict["generated_2d_recommendations"] = res_dict["generated_2d_recommendations"][:3]

        result_data = AnalysisResultResponse(
            id=job.result.id,
            job_id=job.result.job_id,
            result_data=res_dict,
            explanation=job.result.explanation,
            created_at=job.result.created_at,
        )
    return AnalysisJobResponse(
        id=job.id,
        analysis_type=job.analysis_type,
        status=job.status,
        game_code=game_code,
        parameters=job.parameters,
        error_message=job.error_message,
        created_at=job.created_at,
        updated_at=job.updated_at,
        result=result_data,
    )


@router.get("/quota", summary="Get remaining daily analysis quota for current user")
@router.get("/quota/", include_in_schema=False)
def get_user_quota(
    game_id: str | None = Query(None),
    game_code: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    from datetime import datetime, timezone, timedelta
    from app.models.lottery_game import LotteryGame

    tz_local = timezone(timedelta(hours=7))
    start_of_today = datetime.now(tz_local).replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc).replace(tzinfo=None)
    jobs_today = (
        db.query(AnalysisJob)
        .filter(
            AnalysisJob.user_id == current_user.id,
            AnalysisJob.created_at >= start_of_today,
        )
        .all()
    )

    target_game_id = None
    if game_id and str(game_id).strip() not in ("undefined", "null", ""):
        target_game_id = str(game_id).strip()
    elif game_code and str(game_code).strip() not in ("undefined", "null", ""):
        g = db.query(LotteryGame).filter(LotteryGame.code == str(game_code).strip().upper()).first()
        if g:
            target_game_id = str(g.id)

    used_today = 0
    if target_game_id:
        for j in jobs_today:
            params = j.parameters or {}
            if params.get("quota_reset"):
                continue
            j_gid = str(params.get("game_id")) if params.get("game_id") else None
            if j_gid == target_game_id:
                used_today += 1

    is_superadmin = bool(current_user.email == "suzu@gmail.com" or getattr(current_user, "is_superadmin", False))
    if is_superadmin:
        return {
            "success": True,
            "daily_limit": 999999,
            "used_today": used_today,
            "remaining": 999999,
            "is_unlimited": True,
        }

    daily_limit = 1
    remaining = max(0, daily_limit - used_today)

    return {
        "success": True,
        "daily_limit": daily_limit,
        "used_today": used_today,
        "remaining": remaining,
        "is_unlimited": False,
    }


@router.post(
    "",
    response_model=AnalysisJobDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create and run statistical analysis",
)
def create_analysis(
    payload: CreateAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    service: AnalysisService = Depends(get_analysis_service),
) -> AnalysisJobDetailResponse:
    # Check daily limit of 1 analysis run per day PER GAME (Super Admin has UNLIMITED runs)
    from datetime import datetime, timezone, timedelta
    from app.models.lottery_game import LotteryGame

    is_superadmin = bool(current_user.email == "suzu@gmail.com" or getattr(current_user, "is_superadmin", False))
    game_id = (payload.parameters or {}).get("game_id")
    target_game_id = str(game_id).strip() if (game_id and str(game_id).strip() not in ("undefined", "null", "")) else None

    if not is_superadmin and target_game_id:
        tz_local = timezone(timedelta(hours=7))
        start_of_today = datetime.now(tz_local).replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc).replace(tzinfo=None)
        jobs_today = (
            db.query(AnalysisJob)
            .filter(
                AnalysisJob.user_id == current_user.id,
                AnalysisJob.created_at >= start_of_today,
            )
            .all()
        )
        used_for_game = sum(
            1 for j in jobs_today
            if not (j.parameters or {}).get("quota_reset") and str((j.parameters or {}).get("game_id")) == target_game_id
        )
        if used_for_game >= 1:
            g = db.query(LotteryGame).filter(LotteryGame.id == game_id).first()
            g_name = g.name if g else "this lottery game"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Daily analysis quota reached for {g_name}: 1 run per day. Please try again tomorrow or analyze a different game!",
            )

    try:
        job = service.create_and_run_analysis(
            current_user.id,
            payload.analysis_type,
            payload.parameters,
        )
        db.commit()

        # Reload to ensure result relation is populated
        reloaded = service.get_job(current_user.id, job.id)

        if reloaded.status == "FAILED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=reloaded.error_message or "Analysis job execution failed.",
            )

        return AnalysisJobDetailResponse(
            message="Analysis job completed successfully.",
            data=map_job_to_response(reloaded, db, current_user),
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.get(
    "",
    response_model=AnalysisJobListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get analysis history",
)
def list_jobs(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    service: AnalysisService = Depends(get_analysis_service),
) -> AnalysisJobListResponse:
    """Return all historical analysis jobs requested by the current user."""
    jobs = service.list_jobs(current_user.id, limit=limit, offset=offset)
    data = [map_job_to_response(j, db, current_user) for j in jobs]
    return AnalysisJobListResponse(data=data)


@router.get(
    "/{job_id}",
    response_model=AnalysisJobDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get analysis job details",
)
def get_job(
    job_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    service: AnalysisService = Depends(get_analysis_service),
) -> AnalysisJobDetailResponse:
    """Return the details and statistics of a specific analysis request."""
    try:
        job = service.get_job(current_user.id, job_id)
        return AnalysisJobDetailResponse(data=map_job_to_response(job, db, current_user))
    except EntityNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis job not found",
        ) from exc


from app.schemas.record import DeleteResponse


@router.delete(
    "/{job_id}",
    response_model=DeleteResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete an analysis job",
)
def delete_job(
    job_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    service: AnalysisService = Depends(get_analysis_service),
) -> DeleteResponse:
    """Soft-delete an analysis job from the user's history."""
    try:
        # Check ownership first
        job = service.get_job(current_user.id, job_id)
        service._analysis_repository.soft_delete(job.id)
        db.commit()
        return DeleteResponse(message="Analysis job deleted successfully.")
    except EntityNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis job not found",
        ) from exc


from fastapi.responses import Response

@router.get(
    "/{job_id}/export/csv",
    status_code=status.HTTP_200_OK,
    summary="Export analysis result as CSV",
)
def export_analysis_csv(
    job_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    service: AnalysisService = Depends(get_analysis_service),
):
    """Return CSV representation of analysis job result showing last 2 digits only."""
    try:
        job = service.get_job(current_user.id, job_id)
        if not job.result:
            raise HTTPException(status_code=400, detail="Job has no result data to export")
            
        from app.models.lottery_game import LotteryGame
        game_id = (job.parameters or {}).get("game_id")
        game_name = "Unknown Game"
        if game_id:
            game = db.query(LotteryGame).filter(LotteryGame.id == game_id).first()
            if game:
                game_name = game.name

        import csv, io
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write metadata headers
        writer.writerow(["SUSU Lucky Analysis Report"])
        writer.writerow(["Game", game_name])
        writer.writerow(["Model Type", job.analysis_type])
        writer.writerow(["Created At", str(job.created_at)])
        writer.writerow([])
        
        # Write recommended numbers (Trimming all numbers to last 2 digits only)
        writer.writerow(["Recommended Category", "Number (Last 2 Digits Only)", "Score"])
        
        res_data = job.result.result_data or {}
        
        # 6D Pick (Trimmed to last 2 digits)
        if "best_analyzed_6d" in res_data and res_data["best_analyzed_6d"]:
            item = res_data["best_analyzed_6d"][0]
            num = item.get("number", "") if isinstance(item, dict) else str(item)
            score = item.get("score", "N/A") if isinstance(item, dict) else "N/A"
            trimmed_num = num[-2:] if len(num) >= 2 else num
            writer.writerow(["6-Digit Pick (Top 6D)", trimmed_num, score])
            
        # 3D Pick (Trimmed to last 2 digits)
        if "generated_3d_recommendations" in res_data:
            for idx, item in enumerate(res_data["generated_3d_recommendations"]):
                num = item.get("number", "") if isinstance(item, dict) else str(item)
                score = item.get("score", "N/A") if isinstance(item, dict) else "N/A"
                trimmed_num = num[-2:] if len(num) >= 2 else num
                writer.writerow([f"3-Digit Pick #{idx+1} (Top 3D)", trimmed_num, score])
                
        # 2D Picks (Trimmed to last 2 digits)
        if "generated_2d_recommendations" in res_data:
            for idx, item in enumerate(res_data["generated_2d_recommendations"]):
                num = item.get("number", "") if isinstance(item, dict) else str(item)
                score = item.get("score", "N/A") if isinstance(item, dict) else "N/A"
                trimmed_num = num[-2:] if len(num) >= 2 else num
                writer.writerow([f"2-Digit Pick #{idx+1} (Top 2D)", trimmed_num, score])
                
        # Optional metadata block
        writer.writerow([])
        writer.writerow(["General Stats Key", "Value"])
        writer.writerow(["total_records_analyzed", res_data.get("total_records_analyzed", "N/A")])
        if "top_single_digits" in res_data:
            writer.writerow(["top_single_digits", str(res_data["top_single_digits"])])
            
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=analysis_{job_id}.csv"},
        )
    except EntityNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Analysis job not found") from exc


@router.get(
    "/compare/summary",
    status_code=status.HTTP_200_OK,
    summary="Compare stats across lottery games (Thai vs Lao)",
)
def compare_games_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Return statistical comparison matrix across games."""
    from app.models.lottery_result import LotteryResult
    from app.models.lottery_game import LotteryGame
    from collections import Counter

    games = db.query(LotteryGame).all()
    comparison_data = []

    for game in games:
        results = db.query(LotteryResult).filter(LotteryResult.game_id == game.id).all()
        digits = [c for r in results for c in (r.first_prize or "") if c.isdigit()]
        counts = Counter(digits)
        top_digit = counts.most_common(1)[0][0] if counts else "N/A"
        
        comparison_data.append({
            "game_code": game.code,
            "game_name": game.name,
            "total_draws": len(results),
            "top_digit": top_digit,
            "most_common_last2": Counter([r.last2 for r in results if r.last2]).most_common(1)[0][0] if results else "N/A"
        })

    return {"success": True, "comparison": comparison_data}


