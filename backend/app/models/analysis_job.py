"""AnalysisJob model — represents a statistical analysis request."""

import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates

from app.models.base import BaseEntity

if TYPE_CHECKING:
    from app.models.analysis_result import AnalysisResult
    from app.models.user import User


class AnalysisJob(BaseEntity):
    """An analysis job requested by a user.

    Tracks status (PENDING, RUNNING, COMPLETED, FAILED) and input filters.
    """

    __tablename__ = "analysis_jobs"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        index=True,
        nullable=False,
    )
    analysis_type: Mapped[str] = mapped_column(
        String(50),
        index=True,
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        default="PENDING",
        nullable=False,
    )
    parameters: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        default=None,
    )
    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        default=None,
    )

    # --- relationships ---
    user: Mapped["User"] = relationship(
        "User",
        lazy="select",
    )
    result: Mapped["AnalysisResult | None"] = relationship(
        "AnalysisResult",
        back_populates="job",
        cascade="all, delete-orphan",
        uselist=False,
    )

    @validates("analysis_type")
    def validate_analysis_type(self, key: str, value: str) -> str:
        """Enforce standard uppercase analysis types."""
        val = value.strip().upper()
        allowed = {"FREQUENCY", "PAIR", "TRIPLE", "DISTRIBUTION", "TREND"}
        if val not in allowed:
            raise ValueError(f"analysis_type must be one of {allowed}")
        return val

    @validates("status")
    def validate_status(self, key: str, value: str) -> str:
        """Enforce valid job statuses."""
        val = value.strip().upper()
        allowed = {"PENDING", "RUNNING", "COMPLETED", "FAILED"}
        if val not in allowed:
            raise ValueError(f"status must be one of {allowed}")
        return val

    def __repr__(self) -> str:
        return (
            f"<AnalysisJob id={self.id!r} user_id={self.user_id!r}"
            f" type={self.analysis_type!r} status={self.status!r}>"
        )
