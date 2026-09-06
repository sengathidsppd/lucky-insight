"""Service layer for family finance and treasury balance tracking."""

import uuid
from collections import defaultdict
from collections.abc import Sequence
from datetime import date

from app.models.family_transaction import FamilyTransaction
from app.repositories.family_finance_repository import FamilyFinanceRepository
from app.schemas.family_finance import (
    CategoryBreakdown,
    FamilyFinanceSummary,
    FamilyTransactionCreate,
    FamilyTransactionUpdate,
    GoogleSheetConfig,
    PayerBreakdown,
)


class FamilyFinanceService:
    """Business logic for family finances, treasury balance, and expense tracking."""

    def __init__(self, repository: FamilyFinanceRepository) -> None:
        self._repository = repository

    def create_transaction(
        self,
        user_id: uuid.UUID,
        payload: FamilyTransactionCreate,
    ) -> FamilyTransaction:
        """Create and persist a new financial transaction."""
        transaction = FamilyTransaction(
            user_id=user_id,
            transaction_type=payload.transaction_type,
            amount=round(payload.amount, 2),
            currency=payload.currency.upper(),
            category=payload.category.strip(),
            payer_name=payload.payer_name.strip(),
            description=payload.description.strip() if payload.description else None,
            transaction_date=payload.transaction_date,
        )
        return self._repository.create(transaction)

    def update_transaction(
        self,
        transaction_id: uuid.UUID,
        payload: FamilyTransactionUpdate,
    ) -> FamilyTransaction | None:
        """Update an existing financial transaction."""
        transaction = self._repository.get_by_id(transaction_id)
        if not transaction:
            return None

        if payload.transaction_type is not None:
            transaction.transaction_type = payload.transaction_type
        if payload.amount is not None:
            transaction.amount = round(payload.amount, 2)
        if payload.currency is not None:
            transaction.currency = payload.currency.upper()
        if payload.category is not None:
            transaction.category = payload.category.strip()
        if payload.payer_name is not None:
            transaction.payer_name = payload.payer_name.strip()
        if payload.description is not None:
            transaction.description = payload.description.strip() if payload.description else None
        if payload.transaction_date is not None:
            transaction.transaction_date = payload.transaction_date

        return self._repository.update(transaction)

    def delete_transaction(self, transaction_id: uuid.UUID) -> None:
        """Soft-delete a transaction by its UUID."""
        self._repository.soft_delete(transaction_id)

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
        """List transactions with filtering."""
        curr = currency.upper() if currency else None
        return self._repository.list_transactions(
            currency=curr,
            transaction_type=transaction_type,
            category=category,
            date_from=date_from,
            date_to=date_to,
            limit=limit,
            offset=offset,
        )

    def get_summary(
        self,
        *,
        currency: str = "LAK",
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> FamilyFinanceSummary:
        """Calculate total income, total expense, net remaining treasury balance, and breakdowns."""
        curr = currency.upper()
        transactions = self._repository.get_summary_transactions(
            currency=curr,
            date_from=date_from,
            date_to=date_to,
        )

        total_income = 0.0
        total_expense = 0.0
        cat_expenses: dict[str, float] = defaultdict(float)
        payer_expenses: dict[str, float] = defaultdict(float)

        for tx in transactions:
            amt = float(tx.amount)
            if tx.transaction_type == "INCOME":
                total_income += amt
            elif tx.transaction_type == "EXPENSE":
                total_expense += amt
                cat_expenses[tx.category] += amt
                payer_expenses[tx.payer_name] += amt

        net_balance = round(total_income - total_expense, 2)

        # Build category breakdown
        by_category = []
        for cat, amt in sorted(cat_expenses.items(), key=lambda x: x[1], reverse=True):
            pct = round((amt / total_expense * 100.0), 1) if total_expense > 0 else 0.0
            by_category.append(
                CategoryBreakdown(
                    category=cat,
                    amount=round(amt, 2),
                    percentage=pct,
                )
            )

        # Build payer breakdown
        by_payer = []
        for payer, amt in sorted(payer_expenses.items(), key=lambda x: x[1], reverse=True):
            pct = round((amt / total_expense * 100.0), 1) if total_expense > 0 else 0.0
            by_payer.append(
                PayerBreakdown(
                    payer_name=payer,
                    amount=round(amt, 2),
                    percentage=pct,
                )
            )

        return FamilyFinanceSummary(
            currency=curr,
            total_income=round(total_income, 2),
            total_expense=round(total_expense, 2),
            net_balance=net_balance,
            expense_by_category=by_category,
            expense_by_payer=by_payer,
            transaction_count=len(transactions),
        )

    def get_google_sheet_config(self) -> GoogleSheetConfig:
        """Get Google Sheets sync configuration."""
        webhook_url = self._repository.get_setting("google_sheet_webhook_url")
        sheet_url = self._repository.get_setting("google_sheet_view_url")
        auto_sync_val = self._repository.get_setting("google_sheet_auto_sync")
        is_auto_sync = True if auto_sync_val is None else auto_sync_val.lower() == "true"
        return GoogleSheetConfig(
            webhook_url=webhook_url,
            sheet_url=sheet_url,
            is_auto_sync=is_auto_sync,
        )

    def set_google_sheet_config(self, config: GoogleSheetConfig) -> GoogleSheetConfig:
        """Update Google Sheets sync configuration."""
        self._repository.set_setting(
            "google_sheet_webhook_url",
            config.webhook_url.strip() if config.webhook_url else None,
        )
        self._repository.set_setting(
            "google_sheet_view_url",
            config.sheet_url.strip() if config.sheet_url else None,
        )
        self._repository.set_setting(
            "google_sheet_auto_sync",
            "true" if config.is_auto_sync else "false",
        )
        return self.get_google_sheet_config()

