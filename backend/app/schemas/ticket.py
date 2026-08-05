import uuid
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field

class UserTicketBase(BaseModel):
    draw_date: date = Field(default_factory=date.today)
    lottery_type: str = Field(default="LAO", max_length=50)
    number_code: str = Field(..., min_length=1, max_length=255)
    category: str = Field(default="6D", max_length=10)
    amount_spent: float = Field(default=0.0, ge=0.0)
    prize_won: float = Field(default=0.0, ge=0.0)
    status: str = Field(default="PENDING", max_length=20)  # PENDING, WON, MISSED
    notes: Optional[str] = None

class UserTicketCreate(UserTicketBase):
    pass

class UserTicketUpdate(BaseModel):
    draw_date: Optional[date] = None
    lottery_type: Optional[str] = None
    number_code: Optional[str] = None
    category: Optional[str] = None
    amount_spent: Optional[float] = Field(default=None, ge=0.0)
    prize_won: Optional[float] = Field(default=None, ge=0.0)
    status: Optional[str] = None
    notes: Optional[str] = None

class UserTicketResponse(UserTicketBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class UserTicketSummary(BaseModel):
    total_spent: float = 0.0
    total_won: float = 0.0
    net_profit_loss: float = 0.0
    total_tickets: int = 0
    total_won_tickets: int = 0
    win_rate: float = 0.0
