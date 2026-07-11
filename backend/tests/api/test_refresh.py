"""Tests for POST /api/v1/auth/refresh.

These tests create the ``users`` table directly via
``Base.metadata.create_all`` for the duration of this test module only,
and drop it afterwards.
"""

import uuid
from collections.abc import Generator
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, engine
from app.main import app
from app.models.base import Base
from app.models.user import User
from app.security.jwt import create_access_token, create_refresh_token

_users_table_obj = Base.metadata.tables[User.__tablename__]

REGISTER_PAYLOAD = {
    "email": "refresh.api@example.com",
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


def _register(client: TestClient, email: str, password: str = "SecurePass123") -> None:
    payload = {
        **REGISTER_PAYLOAD,
        "email": email,
        "password": password,
        "confirm_password": password,
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201, response.text


def test_refresh_succeeds_and_returns_new_tokens(client: TestClient) -> None:
    email = "refresh.success@example.com"
    password = "SecurePass123"
    _register(client, email, password)

    # 1. Login to get refresh token
    login_response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert login_response.status_code == 200
    login_data = login_response.json()["data"]
    refresh_token = login_data["refresh_token"]

    # 2. Call refresh
    response = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["message"] == "Token refreshed successfully."
    assert body["data"]["access_token"]
    assert body["data"]["refresh_token"]
    assert body["data"]["token_type"] == "Bearer"


def test_refresh_with_expired_token_returns_401(client: TestClient, db_session: Session) -> None:
    email = "refresh.expired@example.com"
    _register(client, email)
    user = db_session.query(User).filter(User.email == email).one()

    # Generate an expired refresh token (expiry in the past)
    expired_token = create_refresh_token(str(user.id), expires_delta=timedelta(seconds=-1)).token

    response = client.post("/api/v1/auth/refresh", json={"refresh_token": expired_token})
    assert response.status_code == 401
    assert response.json()["detail"] == "Expired refresh token"


def test_refresh_with_invalid_signature_returns_400(client: TestClient) -> None:
    # Malformed token
    response = client.post("/api/v1/auth/refresh", json={"refresh_token": "not-a-valid-jwt"})
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid refresh token"


def test_refresh_using_access_token_fails_with_400(client: TestClient, db_session: Session) -> None:
    email = "refresh.wrongtype@example.com"
    _register(client, email)
    user = db_session.query(User).filter(User.email == email).one()

    # Generate access token and try to refresh using it
    access_token = create_access_token(str(user.id)).token

    response = client.post("/api/v1/auth/refresh", json={"refresh_token": access_token})
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid refresh token"


@pytest.mark.filterwarnings("ignore:.*legacy conflict.*")
def test_refresh_with_inactive_user_returns_403(client: TestClient, db_session: Session) -> None:
    email = "refresh.inactive@example.com"
    _register(client, email)

    user = db_session.query(User).filter(User.email == email).one()
    # Generate token before deactivating
    refresh_token = create_refresh_token(str(user.id)).token

    # Deactivate user
    user.is_active = False
    db_session.commit()

    response = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert response.status_code == 403
    assert response.json()["detail"] == "User is inactive"


def test_refresh_with_nonexistent_user_returns_400(client: TestClient, db_session: Session) -> None:
    # Generate token for a random UUID that doesn't exist in DB
    nonexistent_user_id = str(uuid.uuid4())
    refresh_token = create_refresh_token(nonexistent_user_id).token

    response = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid refresh token"
