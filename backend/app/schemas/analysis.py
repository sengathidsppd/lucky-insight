"""Pydantic schemas for the statistical analysis API."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class CreateAnalysisRequest(BaseModel):
    """Request body for initiating a new statistical analysis job."""

    analysis_type: str = Field(
        ...,
        description="One of: FREQUENCY, PAIR, TRIPLE, DISTRIBUTION, TREND",
    )
    parameters: dict[str, Any] | None = Field(
        default=None,
        description=(
            "Optional filter parameters: game_id, category_id, " "source_id, date_from, date_to"
        ),
    )


class AnalysisResultResponse(BaseModel):
    """Public representation of computed analysis statistics."""

    id: uuid.UUID
    job_id: uuid.UUID
    result_data: dict[str, Any]
    explanation: str
    created_at: datetime


class AnalysisJobResponse(BaseModel):
    """Public representation of an analysis request and status."""

    id: uuid.UUID
    analysis_type: str
    status: str
    parameters: dict[str, Any] | None = None
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime
    result: AnalysisResultResponse | None = None


# --- Envelope Responses ---


class AnalysisJobDetailResponse(BaseModel):
    """Response envelope for a single analysis job."""

    success: bool = True
    message: str = "Analysis job retrieved successfully."
    data: AnalysisJobResponse


class AnalysisJobListResponse(BaseModel):
    """Response envelope for a list of analysis jobs."""

    success: bool = True
    message: str = "Analysis jobs retrieved successfully."
    data: list[AnalysisJobResponse]
