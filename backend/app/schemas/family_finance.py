"""Schemas for family finance and treasury tracking."""

import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class FamilyTransactionBase(BaseModel):
    transaction_type: Literal["INCOME", "EXPENSE"] = Field(
        default="EXPENSE",
        description="Type of transaction: INCOME (deposit to treasury) or EXPENSE (deduction)",
    )
    amount: float = Field(..., gt=0, description="Transaction monetary amount")
    currency: str = Field(default="THB", max_length=5, description="Currency code (e.g. THB or LAK)")
    category: str = Field(default="General", max_length=50, description="Spending/Income category")
    payer_name: str = Field(default="Family Fund", max_length=50, description="Payer name (e.g. Suzu, Ning)")
    description: str | None = Field(default=None, max_length=255, description="Optional note or description")
    transaction_date: date = Field(default_factory=date.today, description="Date of transaction")


class FamilyTransactionCreate(FamilyTransactionBase):
    pass


class FamilyTransactionUpdate(BaseModel):
    transaction_type: Literal["INCOME", "EXPENSE"] | None = None
    amount: float | None = Field(default=None, gt=0)
    currency: str | None = None
    category: str | None = None
    payer_name: str | None = None
    description: str | None = None
    transaction_date: date | None = None


class FamilyTransactionResponse(FamilyTransactionBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CategoryBreakdown(BaseModel):
    category: str
    amount: float
    percentage: float


class PayerBreakdown(BaseModel):
    payer_name: str
    amount: float
    percentage: float


class FamilyFinanceSummary(BaseModel):
    currency: str
    total_income: float
    total_expense: float
    net_balance: float
    expense_by_category: list[CategoryBreakdown]
    expense_by_payer: list[PayerBreakdown]
    transaction_count: int
