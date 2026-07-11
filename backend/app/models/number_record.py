"""NumberRecord model — the core entity for recorded numbers."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates

from app.models.base import BaseEntity
from app.models.mixins import _utcnow

if TYPE_CHECKING:
    from app.models.number_category import NumberCategory
    from app.models.number_source import NumberSource
    from app.models.number_tag import NumberTag
    from app.models.user import User


class NumberRecord(BaseEntity):
    """A number entry recorded by a user.

    Each record stores the observed number along with optional metadata
    such as source, category, tags, and a free-text note.
    """

    __tablename__ = "number_records"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        index=True,
        nullable=False,
    )
    number: Mapped[str] = mapped_column(
        String(20),
        index=True,
        nullable=False,
    )
    source_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("number_sources.id"),
        nullable=True,
        default=None,
    )
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("number_categories.id"),
        nullable=True,
        default=None,
    )
    note: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        default=None,
    )
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_utcnow,
        server_default=func.now(),
        index=True,
        nullable=False,
    )
    is_favorite: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    # --- relationships ---
    user: Mapped["User"] = relationship(  # noqa: F821
        "User",
        lazy="select",
    )
    source: Mapped["NumberSource | None"] = relationship(  # noqa: F821
        "NumberSource",
        back_populates="records",
        lazy="select",
    )
    category: Mapped["NumberCategory | None"] = relationship(  # noqa: F821
        "NumberCategory",
        back_populates="records",
        lazy="select",
    )
    tags: Mapped[list["NumberTag"]] = relationship(  # noqa: F821
        "NumberTag",
        secondary="record_tags",
        back_populates="records",
        lazy="select",
    )

    @validates("number")
    def validate_number(self, key: str, value: str) -> str:
        """Ensure number is non-empty and within length limit."""
        if not value or not value.strip():
            raise ValueError("number cannot be empty")
        if len(value) > 20:
            raise ValueError("number must be 20 characters or fewer")
        return value

    def __repr__(self) -> str:
        return f"<NumberRecord id={self.id!r} number={self.number!r}" f" user_id={self.user_id!r}>"
