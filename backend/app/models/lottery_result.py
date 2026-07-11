"""LotteryResult model — stores official draws for each lottery game."""

import uuid
from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates

from app.models.base import BaseEntity

if TYPE_CHECKING:
    from app.models.lottery_game import LotteryGame


class LotteryResult(BaseEntity):
    """An official draw outcome for a specific lottery game."""

    __tablename__ = "lottery_results"

    game_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("lottery_games.id"),
        index=True,
        nullable=False,
    )
    draw_date: Mapped[date] = mapped_column(
        Date,
        index=True,
        nullable=False,
    )
    draw_number: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        default=None,
    )
    first_prize: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )
    last2: Mapped[str | None] = mapped_column(
        String(10),
        nullable=True,
        default=None,
    )
    front3: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        default=None,
    )
    back3: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        default=None,
    )

    # --- relationships ---
    game: Mapped["LotteryGame"] = relationship(
        "LotteryGame",
        back_populates="results",
        lazy="select",
    )

    @validates("first_prize")
    def validate_first_prize(self, key: str, value: str) -> str:
        """Ensure first prize value is non-empty and within length limit."""
        if not value or not value.strip():
            raise ValueError("first_prize cannot be empty")
        if len(value) > 20:
            raise ValueError("first_prize must be 20 characters or fewer")
        return value.strip()

    @validates("last2")
    def validate_last2(self, key: str, value: str | None) -> str | None:
        """Ensure last2 is valid if provided."""
        if value is None:
            return None
        val_strip = value.strip()
        if not val_strip:
            return None
        if len(val_strip) > 10:
            raise ValueError("last2 must be 10 characters or fewer")
        return val_strip

    @validates("front3")
    def validate_front3(self, key: str, value: str | None) -> str | None:
        """Ensure front3 is valid if provided."""
        if value is None:
            return None
        val_strip = value.strip()
        if not val_strip:
            return None
        if len(val_strip) > 50:
            raise ValueError("front3 must be 50 characters or fewer")
        return val_strip

    @validates("back3")
    def validate_back3(self, key: str, value: str | None) -> str | None:
        """Ensure back3 is valid if provided."""
        if value is None:
            return None
        val_strip = value.strip()
        if not val_strip:
            return None
        if len(val_strip) > 50:
            raise ValueError("back3 must be 50 characters or fewer")
        return val_strip

    def __repr__(self) -> str:
        return (
            f"<LotteryResult id={self.id!r} game_id={self.game_id!r}"
            f" draw_date={self.draw_date!r}>"
        )
