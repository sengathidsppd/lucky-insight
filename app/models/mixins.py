"""Reusable SQLAlchemy mixins shared by every model in the application."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column


def _utcnow() -> datetime:
    """Return the current time as a timezone-aware UTC datetime.

    Used as the Python-side default for timestamp columns so values are
    populated even before a row round-trips through the database.
    """
    return datetime.now(UTC)


class UUIDMixin:
    """Adds a UUID primary key, generated automatically.

    Uses PostgreSQL's native UUID column type. The value is generated on
    the Python side (via ``uuid.uuid4``) when the row is flushed, so no
    database-side UUID extension is required.
    """

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )


class TimestampMixin:
    """Adds timezone-aware, UTC created_at/updated_at timestamps.

    Both columns are populated automatically: ``created_at`` on insert and
    ``updated_at`` on every insert and subsequent update.
    """

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_utcnow,
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_utcnow,
        server_default=func.now(),
        onupdate=_utcnow,
        nullable=False,
    )


class SoftDeleteMixin:
    """Adds a nullable deleted_at column for soft deletes.

    Records must never be hard-deleted from the database. Setting
    ``deleted_at`` marks a record as deleted while keeping it available
    for audit purposes, per docs/DATABASE.md.
    """

    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        default=None,
        nullable=True,
    )
