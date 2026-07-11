"""Tests for Import and Export API endpoints."""

import io
import uuid
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, engine
from app.main import app
from app.models.base import Base
from app.models.number_record import NumberRecord
from app.models.user import User

_TABLES = [
    Base.metadata.tables[User.__tablename__],
    Base.metadata.tables[NumberRecord.__tablename__],
]


@pytest.fixture(scope="module", autouse=True)
def _setup_tables() -> Generator[None]:
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


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


def test_import_export_api(client: TestClient, db_session: Session) -> None:
    # 1. Register & Login
    email = f"user.{uuid.uuid4()}@example.com"
    token = _register_and_login(client, email)
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Upload CSV file
    csv_data = (
        "number,source,category,note,is_favorite,recorded_at,tags\n"
        '7777,Dream,Lucky,Jackpot,true,2026-07-11T12:00:00,"win,lucky"\n'
    )
    file_payload = {"file": ("records.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}

    resp = client.post(
        "/api/v1/records/import/csv",
        files=file_payload,
        headers=headers,
    )
    assert resp.status_code == 200
    res_summary = resp.json()
    assert res_summary["imported_count"] == 1
    assert res_summary["failed_count"] == 0

    # 3. Export to CSV file
    resp = client.get("/api/v1/records/export/csv", headers=headers)
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]
    assert "records_export_" in resp.headers["content-disposition"]

    csv_body = resp.text
    assert "7777" in csv_body
    assert "Jackpot" in csv_body
    assert "win,lucky" in csv_body or "lucky,win" in csv_body
