"""Pydantic schemas for the number record management API."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

# --- Lookup response models ---


class SourceResponse(BaseModel):
    """Public representation of a number source."""

    id: uuid.UUID
    name: str
    description: str | None = None


class CategoryResponse(BaseModel):
    """Public representation of a number category."""

    id: uuid.UUID
    name: str
    description: str | None = None


class TagResponse(BaseModel):
    """Public representation of a user-defined tag."""

    id: uuid.UUID
    name: str
    created_at: datetime


# --- Record response ---


class RecordResponse(BaseModel):
    """Public representation of a number record."""

    id: uuid.UUID
    number: str
    source: SourceResponse | None = None
    category: CategoryResponse | None = None
    tags: list[TagResponse] = []
    note: str | None = None
    recorded_at: datetime
    is_favorite: bool
    created_at: datetime
    updated_at: datetime


# --- Record request models ---


class CreateRecordRequest(BaseModel):
    """Request body for creating a new number record."""

    number: str = Field(min_length=1, max_length=20)
    source_id: uuid.UUID | None = None
    category_id: uuid.UUID | None = None
    tag_ids: list[uuid.UUID] = Field(default_factory=list)
    note: str | None = Field(default=None, max_length=2000)
    recorded_at: datetime | None = None
    is_favorite: bool = False


class UpdateRecordRequest(BaseModel):
    """Request body for updating an existing number record."""

    number: str | None = Field(default=None, min_length=1, max_length=20)
    source_id: uuid.UUID | None = None
    category_id: uuid.UUID | None = None
    tag_ids: list[uuid.UUID] | None = None
    note: str | None = Field(default=None, max_length=2000)
    recorded_at: datetime | None = None
    is_favorite: bool | None = None


# --- Tag request models ---


class CreateTagRequest(BaseModel):
    """Request body for creating a new tag."""

    name: str = Field(min_length=1, max_length=100)


class SetRecordTagsRequest(BaseModel):
    """Request body for setting the tags of a record."""

    tag_ids: list[uuid.UUID]


# --- Envelope responses ---


class RecordDetailResponse(BaseModel):
    """Response envelope for a single record."""

    success: bool = True
    message: str = "Record retrieved successfully."
    data: RecordResponse


class RecordListResponse(BaseModel):
    """Response envelope for a paginated list of records."""

    success: bool = True
    message: str = "Records retrieved successfully."
    data: list[RecordResponse]
    total: int
    limit: int
    offset: int


class TagDetailResponse(BaseModel):
    """Response envelope for a single tag."""

    success: bool = True
    message: str = "Tag created successfully."
    data: TagResponse


class TagListResponse(BaseModel):
    """Response envelope for a list of tags."""

    success: bool = True
    message: str = "Tags retrieved successfully."
    data: list[TagResponse]


class SourceListResponse(BaseModel):
    """Response envelope for a list of sources."""

    success: bool = True
    message: str = "Sources retrieved successfully."
    data: list[SourceResponse]


class CategoryListResponse(BaseModel):
    """Response envelope for a list of categories."""

    success: bool = True
    message: str = "Categories retrieved successfully."
    data: list[CategoryResponse]


class DeleteResponse(BaseModel):
    """Response envelope for a successful delete operation."""

    success: bool = True
    message: str = "Record deleted successfully."
