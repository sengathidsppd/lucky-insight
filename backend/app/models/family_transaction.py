"""FamilyTransaction model — tracks family income, expenses, and treasury movements."""

import uuid
from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseEntity

if TYPE_CHECKING:
    from app.models.user import User


class FamilyTransaction(BaseEntity):
    """A financial transaction representing either an income/treasury deposit or an expense deduction."""

    __tablename__ = "family_transactions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        index=True,
        nullable=False,
    )
    transaction_type: Mapped[str] = mapped_column(
        String(10),
        index=True,
        nullable=False,
        default="EXPENSE",
    )
    amount: Mapped[float] = mapped_column(
        Numeric(14, 2),
        nullable=False,
    )
    currency: Mapped[str] = mapped_column(
        String(5),
        nullable=False,
        default="THB",
    )
    category: Mapped[str] = mapped_column(
        String(50),
        index=True,
        nullable=False,
        default="General",
    )
    payer_name: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="Family Fund",
    )
    description: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        default=None,
    )
    transaction_date: Mapped[date] = mapped_column(
        Date,
        index=True,
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", lazy="joined")
