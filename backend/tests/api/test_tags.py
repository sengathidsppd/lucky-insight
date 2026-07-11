"""Tests for Tags API."""

import uuid
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, engine
from app.main import app
from app.models.base import Base
from app.models.number_tag import NumberTag
from app.models.user import User

_TABLES = [
    Base.metadata.tables[User.__tablename__],
    Base.metadata.tables[NumberTag.__tablename__],
]


@pytest.fixture(scope="module", autouse=True)
def _setup_tables() -> Generator[None]:
    Base.metadata.create_all(bind=engine, tables=_TABLES)
    yield
    Base.metadata.drop_all(bind=engine, tables=list(reversed(_TABLES)))


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


def _register_and_login(client: TestClient, email: str) -> str:
    payload = {
        "email": email,
        "password": "SecurePass123",
        "confirm_password": "SecurePass123",
        "first_name": "Ada",
        "last_name": "Lovelace",
    }
    client.post("/api/v1/auth/register", json=payload)
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "SecurePass123"},
    )
    return login_response.json()["data"]["access_token"]


def test_tag_crud_api(client: TestClient) -> None:
    token = _register_and_login(client, f"tags.api.{uuid.uuid4()}@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # Create tag
    resp = client.post("/api/v1/tags/", json={"name": "Family"}, headers=headers)
    assert resp.status_code == 201
    assert resp.json()["success"] is True
    tag_id = resp.json()["data"]["id"]

    # Duplicate tag returns 409
    resp = client.post("/api/v1/tags/", json={"name": "Family"}, headers=headers)
    assert resp.status_code == 409

    # List tags
    resp = client.get("/api/v1/tags/", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()["data"]) == 1
    assert resp.json()["data"][0]["name"] == "Family"

    # Delete tag
    resp = client.delete(f"/api/v1/tags/{tag_id}", headers=headers)
    assert resp.status_code == 200

    # List after delete
    resp = client.get("/api/v1/tags/", headers=headers)
    assert len(resp.json()["data"]) == 0
