"""Tests for GET /api/v1/users/me.

These tests create the ``users`` table directly via
``Base.metadata.create_all`` for the duration of this test module only,
and drop it afterwards. This is test setup, not an Alembic migration —
no migration files are created or modified.
"""

from collections.abc import Generator
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, engine
from app.main import app
from app.models.base import Base
from app.models.user import User
from app.security.jwt import create_access_token

_users_table_obj = Base.metadata.tables[User.__tablename__]

REGISTER_PAYLOAD = {
    "email": "current.user.api@example.com",
    "password": "SecurePass123",
    "confirm_password": "SecurePass123",
    "first_name": "Ada",
    "last_name": "Lovelace",
}


@pytest.fixture(scope="module", autouse=True)
def _users_table() -> Generator[None]:
    """Create the users table for this test module, then drop it."""
    Base.metadata.create_all(bind=engine, tables=[_users_table_obj])
    yield
    Base.metadata.drop_all(bind=engine, tables=[_users_table_obj])


@pytest.fixture
def client() -> Generator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def db_session() -> Generator[Session]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


def _register_and_login(client: TestClient, email: str, password: str = "SecurePass123") -> str:
    """Register a user via the API and return a real access token for them."""
    payload = {
        **REGISTER_PAYLOAD,
        "email": email,
        "password": password,
        "confirm_password": password,
    }
    register_response = client.post("/api/v1/auth/register", json=payload)
    assert register_response.status_code == 201, register_response.text

    login_response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert login_response.status_code == 200, login_response.text
    access_token: str = login_response.json()["data"]["access_token"]
    return access_token


def _auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_get_me_with_valid_token_returns_current_user(client: TestClient) -> None:
    email = "current.user.valid@example.com"
    token = _register_and_login(client, email)

    response = client.get("/api/v1/users/me", headers=_auth_header(token))

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["message"] == "Current user retrieved successfully."
    data = body["data"]
    assert data["email"] == email
    assert data["is_active"] is True
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data
    # Sensitive/internal fields must never appear in the response.
    assert "password" not in data
    assert "password_hash" not in data
    assert "hashed_password" not in data
    assert "refresh_token" not in data
    assert "deleted_at" not in data


def test_get_me_with_missing_token_returns_401(client: TestClient) -> None:
    response = client.get("/api/v1/users/me")

    assert response.status_code == 401


def test_get_me_with_invalid_token_returns_401(client: TestClient) -> None:
    response = client.get("/api/v1/users/me", headers=_auth_header("not-a-real-jwt"))

    assert response.status_code == 401


def test_get_me_with_expired_token_returns_401(client: TestClient) -> None:
    email = "current.user.expired@example.com"
    token = _register_and_login(client, email)

    valid_response = client.get("/api/v1/users/me", headers=_auth_header(token))
    user_id = valid_response.json()["data"]["id"]

    expired_token = create_access_token(user_id, expires_delta=timedelta(seconds=-1))

    response = client.get("/api/v1/users/me", headers=_auth_header(expired_token.token))

    assert response.status_code == 401


def test_get_me_with_inactive_user_returns_403(client: TestClient, db_session: Session) -> None:
    email = "current.user.inactive@example.com"
    token = _register_and_login(client, email)

    user = db_session.query(User).filter(User.email == email).one()
    user.is_active = False
    db_session.commit()

    response = client.get("/api/v1/users/me", headers=_auth_header(token))

    assert response.status_code == 403
