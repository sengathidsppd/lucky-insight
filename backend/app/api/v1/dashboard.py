"""Dashboard API endpoints (v1)."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_active_user
from app.core.database import get_db
from app.models.user import User
from app.repositories.analysis_repository import AnalysisRepository
from app.repositories.number_record_repository import NumberRecordRepository
from app.api.v1.analysis import map_job_to_response
from app.api.v1.records import map_record_to_response
from app.schemas.dashboard import DashboardSummary, DashboardSummaryResponse
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def get_dashboard_service(db: Session = Depends(get_db)) -> DashboardService:
    """Provide a request-scoped ``DashboardService``."""
    return DashboardService(
        db,
        NumberRecordRepository(db),
        AnalysisRepository(db),
    )


@router.get(
    "/summary",
    response_model=DashboardSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get user dashboard summary",
)
def get_summary(
    current_user: User = Depends(get_current_active_user),
    service: DashboardService = Depends(get_dashboard_service),
) -> DashboardSummaryResponse:
    """Return total records, favorites, category and source distributions.

    Also includes recent records and analysis jobs.
    """
    summary_data = service.get_summary(current_user.id)
    return DashboardSummaryResponse(
        data=DashboardSummary(
            total_records=summary_data.total_records,
            total_favorites=summary_data.total_favorites,
            records_by_category=summary_data.records_by_category,
            records_by_source=summary_data.records_by_source,
            recent_records=[map_record_to_response(r) for r in summary_data.recent_records],
            recent_analysis_jobs=[map_job_to_response(j) for j in summary_data.recent_analysis_jobs],
        )
    )
