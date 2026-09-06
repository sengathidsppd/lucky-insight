"""Repository for family finance and treasury tracking."""

import uuid
from collections.abc import Sequence
from datetime import date

from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.models.family_setting import FamilySetting
from app.models.family_transaction import FamilyTransaction
from app.repositories.base_repository import BaseRepository

logger = get_logger(__name__)


class FamilyFinanceRepository(BaseRepository[FamilyTransaction]):
    """Data access layer for family transactions."""

    def __init__(self, session: Session) -> None:
        super().__init__(session, FamilyTransaction)

    def _base_query(self) -> Select[tuple[FamilyTransaction]]:
        """Base query excluding soft-deleted transactions ordered by date descending."""
        return (
            select(FamilyTransaction)
            .where(FamilyTransaction.deleted_at.is_(None))
            .order_by(FamilyTransaction.transaction_date.desc(), FamilyTransaction.created_at.desc())
        )

    def list_transactions(
        self,
        *,
        currency: str | None = None,
        transaction_type: str | None = None,
        category: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Sequence[FamilyTransaction]:
        """List transactions with optional filters."""
        stmt = self._base_query()
        if currency:
            stmt = stmt.where(FamilyTransaction.currency == currency)
        if transaction_type:
            stmt = stmt.where(FamilyTransaction.transaction_type == transaction_type)
        if category:
            stmt = stmt.where(FamilyTransaction.category == category)
        if date_from:
            stmt = stmt.where(FamilyTransaction.transaction_date >= date_from)
        if date_to:
            stmt = stmt.where(FamilyTransaction.transaction_date <= date_to)

        stmt = stmt.offset(offset).limit(limit)
        return self._session.execute(stmt).scalars().all()

    def get_summary_transactions(
        self,
        *,
        currency: str = "LAK",
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> Sequence[FamilyTransaction]:
        """Fetch all transactions matching currency and date range for summary aggregation."""
        stmt = (
            select(FamilyTransaction)
            .where(FamilyTransaction.deleted_at.is_(None))
            .where(FamilyTransaction.currency == currency)
        )
        if date_from:
            stmt = stmt.where(FamilyTransaction.transaction_date >= date_from)
        if date_to:
            stmt = stmt.where(FamilyTransaction.transaction_date <= date_to)

        return self._session.execute(stmt).scalars().all()

    def get_setting(self, key: str) -> str | None:
        """Retrieve a family setting by key."""
        setting = (
            self._session.execute(
                select(FamilySetting)
                .where(FamilySetting.key == key)
                .where(FamilySetting.deleted_at.is_(None))
            )
            .scalars()
            .first()
        )
        return setting.value if setting else None

    def set_setting(self, key: str, value: str | None) -> None:
        """Upsert a family setting by key."""
        setting = (
            self._session.execute(
                select(FamilySetting)
                .where(FamilySetting.key == key)
                .where(FamilySetting.deleted_at.is_(None))
            )
            .scalars()
            .first()
        )
        if setting:
            setting.value = value
        else:
            new_setting = FamilySetting(key=key, value=value)
            self._session.add(new_setting)
        self._session.flush()
