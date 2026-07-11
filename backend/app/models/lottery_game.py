"""LotteryGame model — represents different lottery types."""

from typing import TYPE_CHECKING

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates

from app.models.base import BaseEntity

if TYPE_CHECKING:
    from app.models.lottery_result import LotteryResult


class LotteryGame(BaseEntity):
    """A lottery game type (e.g., Thai Government Lottery, Lao Lottery).

    Serves as the parent category for individual draw results.
    """

    __tablename__ = "lottery_games"

    name: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=False,
    )
    code: Mapped[str] = mapped_column(
        String(20),
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
    results: Mapped[list["LotteryResult"]] = relationship(
        "LotteryResult",
        back_populates="game",
        cascade="all, delete-orphan",
    )

    @validates("name")
    def validate_name(self, key: str, value: str) -> str:
        """Ensure game name is non-empty and within length limit."""
        if not value or not value.strip():
            raise ValueError("name cannot be empty")
        if len(value) > 100:
            raise ValueError("name must be 100 characters or fewer")
        return value

    @validates("code")
    def validate_code(self, key: str, value: str) -> str:
        """Ensure game code is non-empty, uppercase, and within length limit."""
        if not value or not value.strip():
            raise ValueError("code cannot be empty")
        if len(value) > 20:
            raise ValueError("code must be 20 characters or fewer")
        return value.strip().upper()

    def __repr__(self) -> str:
        return f"<LotteryGame id={self.id!r} code={self.code!r} name={self.name!r}>"
