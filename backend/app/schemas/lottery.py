"""Pydantic schemas for the lottery games and results API."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field

# --- Game request/response models ---


class CreateLotteryGameRequest(BaseModel):
    """Request body for creating a new lottery game type."""

    name: str = Field(min_length=1, max_length=100)
    code: str = Field(min_length=1, max_length=20)
    description: str | None = Field(default=None, max_length=1000)


class UpdateLotteryGameRequest(BaseModel):
    """Request body for updating an existing lottery game type."""

    name: str | None = Field(default=None, min_length=1, max_length=100)
    code: str | None = Field(default=None, min_length=1, max_length=20)
    description: str | None = Field(default=None, max_length=1000)


class LotteryGameResponse(BaseModel):
    """Public representation of a lottery game."""

    id: uuid.UUID
    name: str
    code: str
    description: str | None = None
    created_at: datetime
    updated_at: datetime


# --- Result request/response models ---


class CreateLotteryResultRequest(BaseModel):
    """Request body for submitting a new draw outcome."""

    game_id: uuid.UUID
    draw_date: date
    draw_number: str | None = Field(default=None, max_length=50)
    first_prize: str = Field(min_length=1, max_length=20)
    last2: str | None = Field(default=None, min_length=1, max_length=10)
    front3: str | None = Field(default=None, min_length=1, max_length=50)
    back3: str | None = Field(default=None, min_length=1, max_length=50)


class UpdateLotteryResultRequest(BaseModel):
    """Request body for modifying a draw outcome."""

    game_id: uuid.UUID | None = None
    draw_date: date | None = None
    draw_number: str | None = Field(default=None, max_length=50)
    first_prize: str | None = Field(default=None, min_length=1, max_length=20)
    last2: str | None = Field(default=None, min_length=1, max_length=10)
    front3: str | None = Field(default=None, min_length=1, max_length=50)
    back3: str | None = Field(default=None, min_length=1, max_length=50)


class LotteryResultResponse(BaseModel):
    """Public representation of a draw outcome."""

    id: uuid.UUID
    game_id: uuid.UUID
    draw_date: date
    draw_number: str | None = None
    first_prize: str
    last2: str | None = None
    front3: str | None = None
    back3: str | None = None
    created_at: datetime
    updated_at: datetime


# --- Envelope responses ---


class LotteryGameDetailResponse(BaseModel):
    """Response envelope for a single lottery game."""

    success: bool = True
    message: str = "Lottery game retrieved successfully."
    data: LotteryGameResponse


class LotteryGameListResponse(BaseModel):
    """Response envelope for a list of lottery games."""

    success: bool = True
    message: str = "Lottery games retrieved successfully."
    data: list[LotteryGameResponse]


class LotteryResultDetailResponse(BaseModel):
    """Response envelope for a single draw result."""

    success: bool = True
    message: str = "Draw result retrieved successfully."
    data: LotteryResultResponse


class LotteryResultListResponse(BaseModel):
    """Response envelope for a paginated list of draw results."""

    success: bool = True
    message: str = "Draw results retrieved successfully."
    data: list[LotteryResultResponse]
    total: int
    limit: int
    offset: int


class DeleteResponse(BaseModel):
    """Response envelope for a successful delete operation."""

    success: bool = True
    message: str = "Deleted successfully."
