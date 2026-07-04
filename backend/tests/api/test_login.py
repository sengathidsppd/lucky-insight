"""Tests for POST /api/v1/auth/login.

These tests create the ``users`` table directly via
``Base.metadata.create_all`` for the duration of this test module only,
and drop it afterwards. This is test setup, not an Alembic migration —
no migration files are created or modified.
"""

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, engine
from app.main import app
from app.models.base import Base
from app.models.user import User

_users_table_obj = Base.metadata.tables[User.__tablename__]

REGISTER_PAYLOAD = {
    "email": "login.api@example.com",
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


def test_login_succeeds_and_returns_tokens(client: TestClient) -> None:
    email = "login.success.api@example.com"
    password = "SecurePass123"
    _register(client, email, password)

    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["message"] == "Login successful."
    assert body["data"]["access_token"]
    assert body["data"]["refresh_token"]
    assert body["data"]["access_token"] != body["data"]["refresh_token"]
    assert body["data"]["token_type"] == "Bearer"


def test_login_with_wrong_password_returns_401(client: TestClient) -> None:
    email = "login.wrong.password.api@example.com"
    _register(client, email, "SecurePass123")

    response = client.post(
        "/api/v1/auth/login", json={"email": email, "password": "TotallyWrongPassword"}
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"


def test_login_with_unknown_email_returns_401(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "nobody.registered.api@example.com", "password": "SecurePass123"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"


def test_login_with_inactive_user_returns_403(client: TestClient, db_session: Session) -> None:
    email = "login.inactive.api@example.com"
    password = "SecurePass123"
    _register(client, email, password)

    user = db_session.query(User).filter(User.email == email).one()
    user.is_active = False
    db_session.commit()

    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})

    assert response.status_code == 403
    assert response.json()["detail"] == "User account is inactive"


def test_login_missing_password_returns_400(client: TestClient) -> None:
    response = client.post("/api/v1/auth/login", json={"email": "missing.password@example.com"})

    assert response.status_code == 400


def test_login_missing_email_returns_400(client: TestClient) -> None:
    response = client.post("/api/v1/auth/login", json={"password": "SecurePass123"})

    assert response.status_code == 400
