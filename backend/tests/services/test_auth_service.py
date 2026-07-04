"""Tests for AuthService.

These tests create the ``users`` table directly via
``Base.metadata.create_all`` for the duration of this test module only,
and drop it afterwards. This is test setup, not an Alembic migration —
no migration files are created or modified.
"""

import uuid
from collections.abc import Generator

import pytest
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, engine
from app.models.base import Base
from app.models.user import User
from app.repositories.exceptions import DuplicateEntityError, EntityNotFoundError
from app.repositories.user_repository import UserRepository
from app.security.exceptions import InvalidCredentialsException, InvalidTokenException
from app.services.auth_service import AuthService
from app.services.exceptions import InactiveUserException, InvalidEmailFormatException

_users_table_obj = Base.metadata.tables[User.__tablename__]

VALID_PASSWORD = "CorrectHorse123!"


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
def auth_service(db_session: Session) -> AuthService:
    return AuthService(UserRepository(db_session))


# --- register_user -------------------------------------------------------


def test_register_user_succeeds(auth_service: AuthService) -> None:
    user = auth_service.register_user("register.success@example.com", VALID_PASSWORD)

    assert user.id is not None
    assert user.email == "register.success@example.com"
    assert user.password_hash != VALID_PASSWORD
    assert user.password_hash.startswith("$argon2id$")


def test_register_user_with_duplicate_email_raises(auth_service: AuthService) -> None:
    email = "register.duplicate@example.com"
    auth_service.register_user(email, VALID_PASSWORD)

    with pytest.raises(DuplicateEntityError):
        auth_service.register_user(email, VALID_PASSWORD)


def test_register_user_with_invalid_email_format_raises(auth_service: AuthService) -> None:
    with pytest.raises(InvalidEmailFormatException):
        auth_service.register_user("not-an-email", VALID_PASSWORD)


# --- authenticate_user -----------------------------------------------------


def test_authenticate_user_succeeds_with_correct_credentials(auth_service: AuthService) -> None:
    email = "login.success@example.com"
    registered = auth_service.register_user(email, VALID_PASSWORD)

    authenticated = auth_service.authenticate_user(email, VALID_PASSWORD)

    assert authenticated.id == registered.id


def test_authenticate_user_with_wrong_password_raises(auth_service: AuthService) -> None:
    email = "login.wrong.password@example.com"
    auth_service.register_user(email, VALID_PASSWORD)

    with pytest.raises(InvalidCredentialsException):
        auth_service.authenticate_user(email, "TotallyWrongPassword")


def test_authenticate_user_with_unknown_email_raises(auth_service: AuthService) -> None:
    with pytest.raises(InvalidCredentialsException):
        auth_service.authenticate_user("nobody.registered@example.com", VALID_PASSWORD)


def test_authenticate_user_rejects_inactive_account(
    auth_service: AuthService, db_session: Session
) -> None:
    email = "login.inactive@example.com"
    user = auth_service.register_user(email, VALID_PASSWORD)
    user.is_active = False
    db_session.flush()

    with pytest.raises(InactiveUserException):
        auth_service.authenticate_user(email, VALID_PASSWORD)


# --- generate_tokens / refresh_tokens ---------------------------------------


def test_generate_tokens_returns_access_and_refresh_tokens(auth_service: AuthService) -> None:
    user = auth_service.register_user("tokens.generate@example.com", VALID_PASSWORD)

    tokens = auth_service.generate_tokens(user)

    assert tokens.access_token
    assert tokens.refresh_token
    assert tokens.access_token != tokens.refresh_token
    assert tokens.token_type == "bearer"
    assert tokens.expires_in > 0


def test_refresh_tokens_issues_a_new_token_pair(auth_service: AuthService) -> None:
    user = auth_service.register_user("tokens.refresh@example.com", VALID_PASSWORD)
    original = auth_service.generate_tokens(user)

    refreshed = auth_service.refresh_tokens(original.refresh_token)

    assert refreshed.access_token != original.access_token
    assert refreshed.refresh_token != original.refresh_token


def test_refresh_tokens_rejects_a_malformed_token(auth_service: AuthService) -> None:
    with pytest.raises(InvalidTokenException):
        auth_service.refresh_tokens("not-a-real-token")


def test_refresh_tokens_rejects_an_access_token_used_as_refresh_token(
    auth_service: AuthService,
) -> None:
    user = auth_service.register_user("tokens.wrong.type@example.com", VALID_PASSWORD)
    tokens = auth_service.generate_tokens(user)

    with pytest.raises(InvalidTokenException):
        auth_service.refresh_tokens(tokens.access_token)


def test_refresh_tokens_rejects_deactivated_user(
    auth_service: AuthService, db_session: Session
) -> None:
    user = auth_service.register_user("tokens.deactivated@example.com", VALID_PASSWORD)
    tokens = auth_service.generate_tokens(user)

    user.is_active = False
    db_session.flush()

    with pytest.raises(InactiveUserException):
        auth_service.refresh_tokens(tokens.refresh_token)


# --- change_password ---------------------------------------------------------


def test_change_password_succeeds_and_allows_login_with_new_password(
    auth_service: AuthService,
) -> None:
    email = "password.change@example.com"
    user = auth_service.register_user(email, VALID_PASSWORD)

    auth_service.change_password(user.id, VALID_PASSWORD, "BrandNewPassword456!")

    authenticated = auth_service.authenticate_user(email, "BrandNewPassword456!")
    assert authenticated.id == user.id

    with pytest.raises(InvalidCredentialsException):
        auth_service.authenticate_user(email, VALID_PASSWORD)


def test_change_password_rejects_wrong_current_password(auth_service: AuthService) -> None:
    user = auth_service.register_user("password.change.wrong@example.com", VALID_PASSWORD)

    with pytest.raises(InvalidCredentialsException):
        auth_service.change_password(user.id, "WrongCurrentPassword", "NewPassword456!")


def test_change_password_raises_for_unknown_user(auth_service: AuthService) -> None:
    with pytest.raises(EntityNotFoundError):
        auth_service.change_password(uuid.uuid4(), VALID_PASSWORD, "NewPassword456!")
