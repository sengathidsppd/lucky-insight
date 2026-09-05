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
from app.schemas.family_finance import FamilyTransactionCreate
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

    # 2. Deposit into Treasury (+100,000 THB)
    tx_deposit = finance_service.create_transaction(
        user.id,
        FamilyTransactionCreate(
            transaction_type="INCOME",
            amount=100000.0,
            currency="THB",
            category="Salary / Inflow",
            payer_name="Treasury Fund",
            description="Initial September family fund deposit",
            transaction_date=date(2026, 9, 1),
        ),
    )
    db_session.commit()
    assert tx_deposit.id is not None
    assert tx_deposit.transaction_type == "INCOME"

    # 3. Record Expense 1 (-2,500 THB by Suzu)
    tx_exp1 = finance_service.create_transaction(
        user.id,
        FamilyTransactionCreate(
            transaction_type="EXPENSE",
            amount=2500.0,
            currency="THB",
            category="Food & Groceries",
            payer_name="Suzu",
            description="Weekly grocery shopping",
            transaction_date=date(2026, 9, 2),
        ),
    )

    # 4. Record Expense 2 (-1,200 THB by Ning)
    tx_exp2 = finance_service.create_transaction(
        user.id,
        FamilyTransactionCreate(
            transaction_type="EXPENSE",
            amount=1200.0,
            currency="THB",
            category="Home & Utilities",
            payer_name="Ning",
            description="Electricity bill",
            transaction_date=date(2026, 9, 3),
        ),
    )
    db_session.commit()

    # 5. Fetch Summary and verify net remaining balance
    summary = finance_service.get_summary(currency="THB")
    assert summary.total_income == 100000.0
    assert summary.total_expense == 3700.0
    # Net Balance = 100,000 - 3,700 = 96,300
    assert summary.net_balance == 96300.0
    assert summary.transaction_count == 3

    # Check category breakdown
    cats = {c.category: c.amount for c in summary.expense_by_category}
    assert cats["Food & Groceries"] == 2500.0
    assert cats["Home & Utilities"] == 1200.0

    # Check payer breakdown
    payers = {p.payer_name: p.amount for p in summary.expense_by_payer}
    assert payers["Suzu"] == 2500.0
    assert payers["Ning"] == 1200.0

    # 6. Test soft delete updates net remaining balance dynamically
    finance_service.delete_transaction(tx_exp2.id)
    db_session.commit()

    updated_summary = finance_service.get_summary(currency="THB")
    assert updated_summary.total_expense == 2500.0
    # Net Balance after deleting 1,200 expense = 100,000 - 2,500 = 97,500
    assert updated_summary.net_balance == 97500.0
    assert updated_summary.transaction_count == 2
