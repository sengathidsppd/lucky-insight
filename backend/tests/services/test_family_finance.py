"""Tests for FamilyFinanceService and treasury balance tracking."""

import uuid
from collections.abc import Generator
from datetime import date

import pytest
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, engine
from app.models.base import Base
from app.models.family_transaction import FamilyTransaction
from app.models.user import User
from app.repositories.family_finance_repository import FamilyFinanceRepository
from app.schemas.family_finance import FamilyTransactionCreate, FamilyTransactionUpdate
from app.services.family_finance_service import FamilyFinanceService

_TABLES = [
    Base.metadata.tables[User.__tablename__],
    Base.metadata.tables[FamilyTransaction.__tablename__],
]


@pytest.fixture(scope="module", autouse=True)
def _setup_tables() -> Generator[None]:
    Base.metadata.create_all(bind=engine, tables=_TABLES)
    yield
    Base.metadata.drop_all(bind=engine, tables=list(reversed(_TABLES)))


@pytest.fixture
def db_session() -> Generator[Session]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def finance_service(db_session: Session) -> FamilyFinanceService:
    repo = FamilyFinanceRepository(db_session)
    return FamilyFinanceService(repo)


def test_family_finance_treasury_balance(
    db_session: Session,
    finance_service: FamilyFinanceService,
) -> None:
    # 1. Create family user
    user = User(email=f"suzu.{uuid.uuid4()}@gmail.com", password_hash="hash")
    db_session.add(user)
    db_session.commit()

    # 2. Deposit into Treasury (+5,000,000 LAK)
    tx_deposit = finance_service.create_transaction(
        user.id,
        FamilyTransactionCreate(
            transaction_type="INCOME",
            amount=5000000.0,
            currency="LAK",
            category="Salary / Inflow",
            payer_name="Treasury Fund",
            description="Initial September family fund deposit",
            transaction_date=date(2026, 9, 1),
        ),
    )
    db_session.commit()
    assert tx_deposit.id is not None
    assert tx_deposit.transaction_type == "INCOME"

    # 3. Record Expense 1 (-250,000 LAK by Suzu)
    tx_exp1 = finance_service.create_transaction(
        user.id,
        FamilyTransactionCreate(
            transaction_type="EXPENSE",
            amount=250000.0,
            currency="LAK",
            category="Food & Groceries",
            payer_name="Suzu",
            description="Weekly grocery shopping",
            transaction_date=date(2026, 9, 2),
        ),
    )

    # 4. Record Expense 2 (-120,000 LAK by Ning)
    tx_exp2 = finance_service.create_transaction(
        user.id,
        FamilyTransactionCreate(
            transaction_type="EXPENSE",
            amount=120000.0,
            currency="LAK",
            category="Home & Utilities",
            payer_name="Ning",
            description="Electricity bill",
            transaction_date=date(2026, 9, 3),
        ),
    )
    db_session.commit()

    # 5. Fetch Summary and verify net remaining balance
    summary = finance_service.get_summary(currency="LAK")
    assert summary.total_income == 5000000.0
    assert summary.total_expense == 370000.0
    # Net Balance = 5,000,000 - 370,000 = 4,630,000
    assert summary.net_balance == 4630000.0
    assert summary.transaction_count == 3

    # Check category breakdown
    cats = {c.category: c.amount for c in summary.expense_by_category}
    assert cats["Food & Groceries"] == 250000.0
    assert cats["Home & Utilities"] == 120000.0

    # Check payer breakdown
    payers = {p.payer_name: p.amount for p in summary.expense_by_payer}
    assert payers["Suzu"] == 250000.0
    assert payers["Ning"] == 120000.0

    # 6. Test updating an existing transaction
    updated_tx = finance_service.update_transaction(
        tx_exp1.id,
        FamilyTransactionUpdate(
            amount=300000.0,
            category="Dining Out",
            description="Updated grocery bill with drinks",
        ),
    )
    db_session.commit()
    assert updated_tx is not None
    assert updated_tx.amount == 300000.0
    assert updated_tx.category == "Dining Out"
    assert updated_tx.description == "Updated grocery bill with drinks"

    summary_after_update = finance_service.get_summary(currency="LAK")
    assert summary_after_update.total_expense == 420000.0
    assert summary_after_update.net_balance == 4580000.0

    # 7. Test soft delete updates net remaining balance dynamically
    finance_service.delete_transaction(tx_exp2.id)
    db_session.commit()

    updated_summary = finance_service.get_summary(currency="LAK")
    assert updated_summary.total_expense == 300000.0
    # Net Balance after deleting 120,000 expense = 5,000,000 - 300,000 = 4,700,000
    assert updated_summary.net_balance == 4700000.0
    assert updated_summary.transaction_count == 2
