"""Tests for UserService."""

import uuid
from collections.abc import Generator

import pytest
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, engine
from app.models.base import Base
from app.models.user import User
from app.repositories.exceptions import DuplicateEntityError, EntityNotFoundError
from app.repositories.user_repository import UserRepository
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


# --- get_user_by_id / get_user_by_email -----------------------------------


def test_get_user_by_id_returns_matching_user(
    user_service: UserService, user_repository: UserRepository
) -> None:
    created = _make_user(user_repository, "get.by.id@example.com")

    found = user_service.get_user_by_id(created.id)

    assert found.id == created.id


def test_get_user_by_id_raises_for_unknown_id(user_service: UserService) -> None:
    with pytest.raises(EntityNotFoundError):
        user_service.get_user_by_id(uuid.uuid4())


def test_get_user_by_email_returns_matching_user(
    user_service: UserService, user_repository: UserRepository
) -> None:
    email = "get.by.email@example.com"
    created = _make_user(user_repository, email)

    found = user_service.get_user_by_email(email)

    assert found.id == created.id


def test_get_user_by_email_raises_for_unknown_email(user_service: UserService) -> None:
    with pytest.raises(EntityNotFoundError):
        user_service.get_user_by_email("nobody.here@example.com")


# --- update_profile ---------------------------------------------------------


def test_update_profile_changes_email(
    user_service: UserService, user_repository: UserRepository
) -> None:
    created = _make_user(user_repository, "profile.before@example.com")

    updated = user_service.update_profile(created.id, email="profile.after@example.com")

    assert updated.email == "profile.after@example.com"


def test_update_profile_with_no_changes_is_a_no_op(
    user_service: UserService, user_repository: UserRepository
) -> None:
    created = _make_user(user_repository, "profile.unchanged@example.com")

    updated = user_service.update_profile(created.id)

    assert updated.email == "profile.unchanged@example.com"


def test_update_profile_rejects_email_already_in_use(
    user_service: UserService, user_repository: UserRepository
) -> None:
    _make_user(user_repository, "profile.taken@example.com")
    other = _make_user(user_repository, "profile.other@example.com")

    with pytest.raises(DuplicateEntityError):
        user_service.update_profile(other.id, email="profile.taken@example.com")


def test_update_profile_raises_for_unknown_user(user_service: UserService) -> None:
    with pytest.raises(EntityNotFoundError):
        user_service.update_profile(uuid.uuid4(), email="whoever@example.com")


# --- activate_user / deactivate_user ---------------------------------------


def test_deactivate_and_activate_user_toggle_state(
    user_service: UserService, user_repository: UserRepository
) -> None:
    created = _make_user(user_repository, "activation.toggle@example.com")
    assert created.is_active is True

    deactivated = user_service.deactivate_user(created.id)
    assert deactivated.is_active is False

    activated = user_service.activate_user(created.id)
    assert activated.is_active is True


def test_activate_user_raises_for_unknown_user(user_service: UserService) -> None:
    with pytest.raises(EntityNotFoundError):
        user_service.activate_user(uuid.uuid4())


def test_deactivate_user_raises_for_unknown_user(user_service: UserService) -> None:
    with pytest.raises(EntityNotFoundError):
        user_service.deactivate_user(uuid.uuid4())
