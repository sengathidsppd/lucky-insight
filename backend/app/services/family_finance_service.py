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
        currency: str = "THB",
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
