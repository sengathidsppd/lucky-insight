"""Tests for reusable authentication dependencies.

These tests create the ``users`` table directly via
``Base.metadata.create_all`` for the duration of this test module only,
and drop it afterwards. This is test setup, not an Alembic migration —
no migration files are created or modified.

The dependency functions are plain Python functions under FastAPI's
``Depends()`` machinery, so they are called directly here with explicit
arguments rather than through a live HTTP request/router.
"""

from collections.abc import Generator
from datetime import timedelta

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies.auth import (
    get_current_active_user,
    get_current_user,
    optional_current_user,
)
from app.core.database import SessionLocal, engine
from app.models.base import Base
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.security.jwt import create_access_token, create_refresh_token
from app.services.user_service import UserService

_users_table_obj = Base.metadata.tables[User.__tablename__]


@pytest.fixture(scope="module", autouse=True)
def _users_table() -> Generator[None]:
    """Create the users table for this test module, then drop it."""
    Base.metadata.create_all(bind=engine, tables=[_users_table_obj])
    yield
    Base.metadata.drop_all(bind=engine, tables=[_users_table_obj])


@pytest.fixture
def db_session() -> Generator[Session]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def user_repository(db_session: Session) -> UserRepository:
    return UserRepository(db_session)


@pytest.fixture
def user_service(user_repository: UserRepository) -> UserService:
    return UserService(user_repository)


def _make_user(repo: UserRepository, email: str) -> User:
    return repo.create_user(User(email=email, password_hash="hashed-password-value"))


# --- get_current_user -------------------------------------------------------


def test_get_current_user_with_valid_token_returns_user(
    user_repository: UserRepository, user_service: UserService
) -> None:
    user = _make_user(user_repository, "dependency.valid@example.com")
    token = create_access_token(str(user.id))

    result = get_current_user(token=token.token, user_service=user_service)

    assert result.id == user.id


def test_get_current_user_with_missing_token_raises_401(user_service: UserService) -> None:
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(token=None, user_service=user_service)

    assert exc_info.value.status_code == 401


def test_get_current_user_with_invalid_token_raises_401(user_service: UserService) -> None:
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(token="not-a-real-jwt", user_service=user_service)

    assert exc_info.value.status_code == 401


def test_get_current_user_with_expired_token_raises_401(
    user_repository: UserRepository, user_service: UserService
) -> None:
    user = _make_user(user_repository, "dependency.expired@example.com")
    expired_token = create_access_token(str(user.id), expires_delta=timedelta(seconds=-1))

    with pytest.raises(HTTPException) as exc_info:
        get_current_user(token=expired_token.token, user_service=user_service)

    assert exc_info.value.status_code == 401


def test_get_current_user_rejects_a_refresh_token(
    user_repository: UserRepository, user_service: UserService
) -> None:
    """Access-only dependency must reject a refresh token (different secret)."""
    user = _make_user(user_repository, "dependency.wrong.token.type@example.com")
    refresh_token = create_refresh_token(str(user.id))

    with pytest.raises(HTTPException) as exc_info:
        get_current_user(token=refresh_token.token, user_service=user_service)

    assert exc_info.value.status_code == 401


def test_get_current_user_for_deleted_user_raises_401(
    user_repository: UserRepository, user_service: UserService
) -> None:
    user = _make_user(user_repository, "dependency.deleted@example.com")
    token = create_access_token(str(user.id))
    user_repository.soft_delete(user.id)

    with pytest.raises(HTTPException) as exc_info:
        get_current_user(token=token.token, user_service=user_service)

    assert exc_info.value.status_code == 401


# --- get_current_active_user -------------------------------------------------


def test_get_current_active_user_returns_active_user(user_repository: UserRepository) -> None:
    user = _make_user(user_repository, "dependency.active@example.com")

    result = get_current_active_user(current_user=user)

    assert result.id == user.id


def test_get_current_active_user_rejects_inactive_user(
    user_repository: UserRepository,
) -> None:
    user = _make_user(user_repository, "dependency.inactive@example.com")
    user.is_active = False

    with pytest.raises(HTTPException) as exc_info:
        get_current_active_user(current_user=user)

    assert exc_info.value.status_code == 403


# --- optional_current_user ----------------------------------------------------


def test_optional_current_user_returns_user_for_valid_token(
    user_repository: UserRepository, user_service: UserService
) -> None:
    user = _make_user(user_repository, "dependency.optional.valid@example.com")
    token = create_access_token(str(user.id))

    result = optional_current_user(token=token.token, user_service=user_service)

    assert result is not None
    assert result.id == user.id


def test_optional_current_user_returns_none_for_missing_token(
    user_service: UserService,
) -> None:
    result = optional_current_user(token=None, user_service=user_service)

    assert result is None


def test_optional_current_user_returns_none_for_invalid_token(
    user_service: UserService,
) -> None:
    result = optional_current_user(token="not-a-real-jwt", user_service=user_service)

    assert result is None


def test_optional_current_user_returns_none_for_expired_token(
    user_repository: UserRepository, user_service: UserService
) -> None:
    user = _make_user(user_repository, "dependency.optional.expired@example.com")
    expired_token = create_access_token(str(user.id), expires_delta=timedelta(seconds=-1))

    result = optional_current_user(token=expired_token.token, user_service=user_service)

    assert result is None
