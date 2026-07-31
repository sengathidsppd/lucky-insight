"""Association table linking number records to their tags (many-to-many)."""

from sqlalchemy import Column, ForeignKey, Table
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import Base

record_tags = Table(
    "record_tags",
    Base.metadata,
    Column(
        "record_id",
        UUID(as_uuid=True),
        ForeignKey("number_records.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "tag_id",
        UUID(as_uuid=True),
        ForeignKey("number_tags.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)
