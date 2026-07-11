"""AnalysisResult model — stores computed statistics and user explanations."""

import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseEntity

if TYPE_CHECKING:
    from app.models.analysis_job import AnalysisJob


class AnalysisResult(BaseEntity):
    """Calculated output of a completed AnalysisJob."""

    __tablename__ = "analysis_results"

    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("analysis_jobs.id"),
        unique=True,
        index=True,
        nullable=False,
    )
    result_data: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
    )
    explanation: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    # --- relationships ---
    job: Mapped["AnalysisJob"] = relationship(
        "AnalysisJob",
        back_populates="result",
        lazy="select",
    )

    def __repr__(self) -> str:
        return f"<AnalysisResult id={self.id!r} job_id={self.job_id!r}>"
