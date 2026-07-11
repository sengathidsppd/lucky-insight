"""Tests for the Analysis API endpoints."""

import uuid
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, engine
from app.main import app
from app.models.analysis_job import AnalysisJob
from app.models.analysis_result import AnalysisResult
from app.models.base import Base
from app.models.lottery_game import LotteryGame
from app.models.lottery_result import LotteryResult
from app.models.number_record import NumberRecord
from app.models.user import User
from app.repositories.number_record_repository import NumberRecordRepository

_TABLES = [
    Base.metadata.tables[User.__tablename__],
    Base.metadata.tables[NumberRecord.__tablename__],
    Base.metadata.tables[LotteryGame.__tablename__],
    Base.metadata.tables[LotteryResult.__tablename__],
    Base.metadata.tables[AnalysisJob.__tablename__],
    Base.metadata.tables[AnalysisResult.__tablename__],
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


def test_analysis_api_endpoints(
    client: TestClient,
    db_session: Session,
) -> None:
    # 1. Register & Login
    email = f"user.{uuid.uuid4()}@example.com"
    token = _register_and_login(client, email)
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get User object to create dummy records
    user = db_session.query(User).filter_by(email=email).one()
    rec_repo = NumberRecordRepository(db_session)
    rec_repo.create(NumberRecord(user_id=user.id, number="987", is_favorite=False))
    rec_repo.create(NumberRecord(user_id=user.id, number="654", is_favorite=False))
    db_session.commit()

    # 3. Create analysis job
    payload = {
        "analysis_type": "FREQUENCY",
        "parameters": {},
    }
    resp = client.post("/api/v1/analysis/", json=payload, headers=headers)
    assert resp.status_code == 201
    job_data = resp.json()["data"]
    assert job_data["status"] == "COMPLETED"
    assert job_data["result"] is not None
    job_id = job_data["id"]

    # 4. List historical analysis jobs
    resp = client.get("/api/v1/analysis/", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()["data"]) >= 1

    # 5. Fetch job details
    resp = client.get(f"/api/v1/analysis/{job_id}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["data"]["analysis_type"] == "FREQUENCY"
