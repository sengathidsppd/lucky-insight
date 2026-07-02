"""Declarative base and the abstract entity every model inherits from.

Every ORM model in the application must inherit from ``BaseEntity`` (or,
in rare cases, directly from ``Base``). Centralizing the declarative base
here keeps a single, consistent ``MetaData`` object for Alembic
autogeneration and guarantees every table follows the naming conventions
documented in docs/DATABASE.md.
"""

from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase

from app.models.mixins import SoftDeleteMixin, TimestampMixin, UUIDMixin

# Naming convention matching docs/DATABASE.md:
#   Indexes:        idx_table_column
#   Unique keys:     uk_table_column
#   Foreign keys:    fk_child_parent
#   Primary keys:    pk_table
NAMING_CONVENTION = {
    "ix": "idx_%(table_name)s_%(column_0_name)s",
    "uq": "uk_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    """Declarative base shared by every ORM model in the application."""

    metadata = MetaData(naming_convention=NAMING_CONVENTION)


class BaseEntity(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """Abstract base for all persisted entities.

    Combines the UUID primary key, timezone-aware timestamps, and
    soft-delete support that every table in the system shares.
    """

    __abstract__ = True
