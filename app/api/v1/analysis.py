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
            # If user is not Super Admin, redact 4D recommendations for security
            is_superadmin = bool(user and (user.email == "suzu@gmail.com" or getattr(user, "is_superadmin", False)))
            if not is_superadmin:
                res_dict.pop("generated_4d_recommendations", None)

            # If user is not admin, redact 6D and 3D recommendations for security
            if user and not user.is_admin:
                res_dict.pop("best_analyzed_6d", None)
                res_dict.pop("generated_3d_recommendations", None)

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
    """Trigger a statistical calculation job. Returns completed or failed job details."""
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
    """Return CSV representation of analysis job result."""
    try:
        job = service.get_job(current_user.id, job_id)
        if not job.result:
            raise HTTPException(status_code=400, detail="Job has no result data to export")
            
        import csv, io
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Analysis Type", "Status", "Created At", "Explanation"])
        writer.writerow([job.analysis_type, job.status, str(job.created_at), job.result.explanation])
        writer.writerow([])
        writer.writerow(["Key", "Value"])
        for k, v in job.result.result_data.items():
            writer.writerow([k, str(v)])
            
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


