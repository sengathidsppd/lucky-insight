"""Tests for Lookups API (GET /api/v1/lookups/sources and GET /api/v1/lookups/categories)."""

import uuid
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, engine
from app.main import app
from app.models.base import Base
from app.models.number_category import NumberCategory
from app.models.number_source import NumberSource
from app.models.user import User

_TABLES = [
    Base.metadata.tables[User.__tablename__],
    Base.metadata.tables[NumberSource.__tablename__],
    Base.metadata.tables[NumberCategory.__tablename__],
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


def test_list_sources_and_categories(client: TestClient, db_session: Session) -> None:
    # Seed
    src = NumberSource(name="Car Plate Lookup Test", description="Vehicle plates")
    cat = NumberCategory(name="Lucky Lookup Test", description="Lucky numbers")
    db_session.add(src)
    db_session.add(cat)
    db_session.commit()

    token = _register_and_login(client, f"lookup.api.{uuid.uuid4()}@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # Sources
    resp = client.get("/api/v1/lookups/sources", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["success"] is True
    assert any(s["name"] == "Car Plate Lookup Test" for s in resp.json()["data"])

    # Categories
    resp = client.get("/api/v1/lookups/categories", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["success"] is True
    assert any(c["name"] == "Lucky Lookup Test" for c in resp.json()["data"])
