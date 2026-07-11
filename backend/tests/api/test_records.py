"""Tests for Records API endpoints."""

import uuid
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, engine
from app.main import app
from app.models.base import Base
from app.models.number_category import NumberCategory
from app.models.number_record import NumberRecord
from app.models.number_source import NumberSource
from app.models.number_tag import NumberTag
from app.models.user import User

_TABLES = [
    Base.metadata.tables[User.__tablename__],
    Base.metadata.tables[NumberSource.__tablename__],
    Base.metadata.tables[NumberCategory.__tablename__],
    Base.metadata.tables[NumberTag.__tablename__],
    Base.metadata.tables[NumberRecord.__tablename__],
    Base.metadata.tables["record_tags"],
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


def test_records_crud_api(client: TestClient) -> None:
    token = _register_and_login(client, f"records.api.{uuid.uuid4()}@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # Create tag
    tag_resp = client.post("/api/v1/tags/", json={"name": "Work"}, headers=headers)
    tag_id = tag_resp.json()["data"]["id"]

    # Create record
    payload = {
        "number": "555",
        "note": "boss call",
        "tag_ids": [tag_id],
    }
    resp = client.post("/api/v1/records/", json=payload, headers=headers)
    assert resp.status_code == 201
    record_id = resp.json()["data"]["id"]
    assert resp.json()["data"]["number"] == "555"

    # Get record details
    resp = client.get(f"/api/v1/records/{record_id}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["data"]["note"] == "boss call"

    # Search records
    resp = client.get("/api/v1/records/search", params={"number": "55"}, headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()["data"]) == 1

    # Favorite record
    resp = client.post(f"/api/v1/records/{record_id}/favorite", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["data"]["is_favorite"] is True

    # Update record
    resp = client.patch(
        f"/api/v1/records/{record_id}",
        json={"number": "888", "is_favorite": False},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["number"] == "888"
    assert resp.json()["data"]["is_favorite"] is False

    # Delete record
    resp = client.delete(f"/api/v1/records/{record_id}", headers=headers)
    assert resp.status_code == 200

    # Get after delete
    resp = client.get(f"/api/v1/records/{record_id}", headers=headers)
    assert resp.status_code == 404
