"""Tests for Dashboard API endpoints."""

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
from app.repositories.number_record_repository import NumberRecordRepository
from app.services.import_export_service import ImportExportService

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


def test_dashboard_api(client: TestClient, db_session: Session) -> None:
    # 1. Register & Login
    email = f"user.{uuid.uuid4()}@example.com"
    token = _register_and_login(client, email)
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Add some records via ImportExportService helper
    user = db_session.query(User).filter_by(email=email).one()
    ie_service = ImportExportService(db_session, NumberRecordRepository(db_session))
    csv_data = (
        b"number,source,category,note,is_favorite,recorded_at,tags\n"
        b"123,Dream,General,A general note,true,2026-07-11T12:00:00,tag1\n"
        b"456,Book,General,Another note,false,2026-07-11T12:00:00,tag2\n"
    )
    ie_service.import_records_from_csv(user.id, csv_data)
    db_session.commit()

    # 3. Retrieve Dashboard Summary
    resp = client.get("/api/v1/dashboard/summary", headers=headers)
    assert resp.status_code == 200
    res_data = resp.json()["data"]
    assert res_data["total_records"] == 2
    assert res_data["total_favorites"] == 1

    # Check categories
    cats = res_data["records_by_category"]
    assert len(cats) == 1
    assert cats[0]["category_name"] == "General"
    assert cats[0]["count"] == 2

    # Check sources
    srcs = res_data["records_by_source"]
    assert len(srcs) == 2
    src_map = {s["source_name"]: s["count"] for s in srcs}
    assert src_map["Dream"] == 1
    assert src_map["Book"] == 1
