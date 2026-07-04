"""Tests for POST /api/v1/auth/register.

These tests create the ``users`` table directly via
``Base.metadata.create_all`` for the duration of this test module only,
and drop it afterwards. This is test setup, not an Alembic migration —
no migration files are created or modified.
"""

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from app.core.database import engine
from app.main import app
from app.models.base import Base
from app.models.user import User

_users_table_obj = Base.metadata.tables[User.__tablename__]

VALID_PAYLOAD = {
    "email": "register.api@example.com",
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


def _payload(**overrides: str) -> dict[str, str]:
    return {**VALID_PAYLOAD, **overrides}


def test_register_succeeds(client: TestClient) -> None:
    payload = _payload(email="register.success.api@example.com")

    response = client.post("/api/v1/auth/register", json=payload)

    assert response.status_code == 201
    body = response.json()
    assert body["success"] is True
    assert body["message"] == "User registered successfully."
    assert body["data"]["email"] == payload["email"]
    assert body["data"]["first_name"] == payload["first_name"]
    assert body["data"]["last_name"] == payload["last_name"]
    assert body["data"]["is_active"] is True
    assert "id" in body["data"]


def test_register_with_duplicate_email_returns_409(client: TestClient) -> None:
    payload = _payload(email="register.duplicate.api@example.com")
    first = client.post("/api/v1/auth/register", json=payload)
    assert first.status_code == 201

    second = client.post("/api/v1/auth/register", json=payload)

    assert second.status_code == 409
    assert "already exists" in second.json()["detail"]


def test_register_with_invalid_email_returns_400(client: TestClient) -> None:
    payload = _payload(email="not-an-email")

    response = client.post("/api/v1/auth/register", json=payload)

    assert response.status_code == 400
    body = response.json()
    assert body["success"] is False


def test_register_with_password_mismatch_returns_400(client: TestClient) -> None:
    payload = _payload(
        email="register.mismatch.api@example.com",
        password="SecurePass123",
        confirm_password="ADifferentPassword456",
    )

    response = client.post("/api/v1/auth/register", json=payload)

    assert response.status_code == 400
    body = response.json()
    assert body["success"] is False
    assert any("match" in error["msg"] for error in body["errors"])


def test_register_with_weak_password_returns_400(client: TestClient) -> None:
    payload = _payload(
        email="register.weak.api@example.com",
        password="short",
        confirm_password="short",
    )

    response = client.post("/api/v1/auth/register", json=payload)

    assert response.status_code == 400
    body = response.json()
    assert body["success"] is False


def test_register_missing_required_field_returns_400(client: TestClient) -> None:
    payload = _payload(email="register.missing.field@example.com")
    del payload["first_name"]

    response = client.post("/api/v1/auth/register", json=payload)

    assert response.status_code == 400
