"""Pydantic schemas for the dashboard API."""

from pydantic import BaseModel

from app.schemas.analysis import AnalysisJobResponse
from app.schemas.record import RecordResponse


class CategoryCountResponse(BaseModel):
    """Categorized record count distribution."""

    category_name: str
    count: int


class SourceCountResponse(BaseModel):
    """Source-based record count distribution."""

    source_name: str
    count: int


class DashboardSummary(BaseModel):
    """Dashboard statistics summary for the user."""

    total_records: int
    total_favorites: int
    records_by_category: list[CategoryCountResponse]
    records_by_source: list[SourceCountResponse]
    recent_records: list[RecordResponse]
    recent_analysis_jobs: list[AnalysisJobResponse]


class DashboardSummaryResponse(BaseModel):
    """Envelope response for the dashboard summary."""

    success: bool = True
    message: str = "Dashboard summary retrieved successfully."
    data: DashboardSummary
