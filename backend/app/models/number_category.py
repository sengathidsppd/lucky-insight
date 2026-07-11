"""NumberCategory model — lookup table for number classifications."""

from typing import TYPE_CHECKING

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates

from app.models.base import BaseEntity

if TYPE_CHECKING:
    from app.models.number_record import NumberRecord


class NumberCategory(BaseEntity):
    """Predefined category for classifying number records.

    Examples include lucky, daily, lottery, observation, and other.
    """

    __tablename__ = "number_categories"

    name: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=False,
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        default=None,
    )

    # --- relationships ---
    records: Mapped[list["NumberRecord"]] = relationship(
        "NumberRecord",
        back_populates="category",
    )

    @validates("name")
    def validate_name(self, key: str, value: str) -> str:
        """Ensure category name is non-empty and within length limit."""
        if not value or not value.strip():
            raise ValueError("name cannot be empty")
        if len(value) > 100:
            raise ValueError("name must be 100 characters or fewer")
        return value

    def __repr__(self) -> str:
        return f"<NumberCategory id={self.id!r} name={self.name!r}>"
