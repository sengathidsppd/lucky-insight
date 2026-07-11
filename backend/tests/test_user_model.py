"""Tests for the User ORM model and the shared BaseEntity mixins.

These tests create the ``users`` table directly via
``Base.metadata.create_all`` for the duration of this test module only,
and drop it afterwards. This is test setup, not an Alembic migration —
no migration files are created or modified.
"""

from collections.abc import Generator

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, engine
from app.models.base import Base
from app.models.user import User

_users_table_obj = Base.metadata.tables[User.__tablename__]


@pytest.fixture(scope="module", autouse=True)
def _users_table() -> Generator[None]:
    """Create all tables for this test module, then drop them."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session() -> Generator[Session]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


def _make_user(email: str = "test.user@example.com") -> User:
    return User(email=email, password_hash="hashed-password-value")


def test_uuid_is_generated(db_session: Session) -> None:
    """A UUID primary key is generated automatically on insert."""
    user = _make_user("uuid.check@example.com")
    assert user.id is None  # not yet assigned before the row is flushed

    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    assert user.id is not None


def test_created_at_is_populated(db_session: Session) -> None:
    """created_at is populated automatically and is timezone-aware."""
    user = _make_user("created.at@example.com")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    assert user.created_at is not None
    assert user.created_at.tzinfo is not None
    assert user.updated_at is not None


def test_email_is_unique(db_session: Session) -> None:
    """Inserting a second user with the same email violates the unique constraint."""
    email = "duplicate@example.com"
    db_session.add(_make_user(email))
    db_session.commit()

    db_session.add(_make_user(email))
    with pytest.raises(IntegrityError):
        db_session.commit()


def test_soft_delete_column_exists(db_session: Session) -> None:
    """The soft-delete column is present and defaults to NULL (not deleted)."""
    user = _make_user("soft.delete@example.com")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    assert hasattr(user, "deleted_at")
    assert user.deleted_at is None


def test_invalid_email_format_is_rejected() -> None:
    with pytest.raises(ValueError, match="not a valid email"):
        User(email="not-an-email", password_hash="hashed-password-value")


def test_email_too_long_is_rejected() -> None:
    overlong_email = f"{'a' * 250}@example.com"
    with pytest.raises(ValueError, match="between 1 and 255"):
        User(email=overlong_email, password_hash="hashed-password-value")


def test_empty_password_hash_is_rejected() -> None:
    with pytest.raises(ValueError, match="cannot be empty"):
        User(email="valid.user@example.com", password_hash="")


def test_repr_includes_email() -> None:
    user = _make_user("repr.check@example.com")
    assert "repr.check@example.com" in repr(user)
