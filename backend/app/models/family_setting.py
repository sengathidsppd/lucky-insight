"""FamilySetting model — key-value settings for family finance and integrations."""

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseEntity


class FamilySetting(BaseEntity):
    """Configuration settings shared across family finance members (e.g. Google Sheets sync)."""

    __tablename__ = "family_settings"

    key: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=False,
    )
    value: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        default=None,
    )
