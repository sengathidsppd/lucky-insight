"""Analysis API endpoints (v1)."""

import uuid

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


def map_job_to_response(job: AnalysisJob) -> AnalysisJobResponse:
    """Map AnalysisJob ORM model to Pydantic schema."""
    result_data = None
    if job.result:
        result_data = AnalysisResultResponse(
            id=job.result.id,
            job_id=job.result.job_id,
            result_data=job.result.result_data,
            explanation=job.result.explanation,
            created_at=job.result.created_at,
        )
    return AnalysisJobResponse(
        id=job.id,
        analysis_type=job.analysis_type,
        status=job.status,
        parameters=job.parameters,
        error_message=job.error_message,
        created_at=job.created_at,
        updated_at=job.updated_at,
        result=result_data,
    )


@router.post(
    "/",
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
            data=map_job_to_response(reloaded),
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.get(
    "/",
    response_model=AnalysisJobListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get analysis history",
)
def list_jobs(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_active_user),
    service: AnalysisService = Depends(get_analysis_service),
) -> AnalysisJobListResponse:
    """Return all historical analysis jobs requested by the current user."""
    jobs = service.list_jobs(current_user.id, limit=limit, offset=offset)
    data = [map_job_to_response(j) for j in jobs]
    return AnalysisJobListResponse(data=data)


@router.get(
    "/{job_id}",
    response_model=AnalysisJobDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get analysis job details",
)
def get_job(
    job_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    service: AnalysisService = Depends(get_analysis_service),
) -> AnalysisJobDetailResponse:
    """Return the details and statistics of a specific analysis request."""
    try:
        job = service.get_job(current_user.id, job_id)
        return AnalysisJobDetailResponse(data=map_job_to_response(job))
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
