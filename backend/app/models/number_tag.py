"""NumberTag model — user-defined tags for organizing records."""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates

from app.models.base import BaseEntity

if TYPE_CHECKING:
    from app.models.number_record import NumberRecord


class NumberTag(BaseEntity):
    """A user-defined label that can be attached to number records.

    Tags are scoped per user — the same tag name may exist for
    different users, but each user's tag names must be unique.
    """

    __tablename__ = "number_tags"
    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_number_tags_user_id_name"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(
        String(100),
        index=True,
        nullable=False,
    )

    # --- relationships ---
    records: Mapped[list["NumberRecord"]] = relationship(
        "NumberRecord",
        secondary="record_tags",
        back_populates="tags",
    )

    @validates("name")
    def validate_name(self, key: str, value: str) -> str:
        """Ensure tag name is non-empty and within length limit."""
        if not value or not value.strip():
            raise ValueError("name cannot be empty")
        if len(value) > 100:
            raise ValueError("name must be 100 characters or fewer")
        return value

    def __repr__(self) -> str:
        return f"<NumberTag id={self.id!r} name={self.name!r} user_id={self.user_id!r}>"
