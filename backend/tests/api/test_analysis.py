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


from app.security.jwt import create_access_token


def _get_user_token(user: User) -> str:
    return create_access_token(str(user.id)).token


def test_analysis_api_endpoints(
    client: TestClient,
    db_session: Session,
) -> None:
    # 1. Create a regular user
    email = f"user.{uuid.uuid4()}@example.com"
    user = User(email=email, password_hash="hash", is_active=True, is_admin=False)
    db_session.add(user)
    db_session.commit()

    token = _get_user_token(user)
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Add sample records
    rec_repo = NumberRecordRepository(db_session)
    rec_repo.create(NumberRecord(user_id=user.id, number="987123", is_favorite=False))
    rec_repo.create(NumberRecord(user_id=user.id, number="654321", is_favorite=False))
    db_session.commit()

    # 3. Create analysis job as regular user
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

    # Regular user should NOT have 6D or 4D recommendations, but should have 2D recommendations
    res_dict = job_data["result"]["result_data"]
    assert res_dict.get("best_analyzed_6d") is None
    assert res_dict.get("generated_4d_recommendations") is None
    assert len(res_dict.get("generated_2d_recommendations", [])) == 3

    # 4. List historical analysis jobs
    resp = client.get("/api/v1/analysis/", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()["data"]) >= 1

    # 5. Fetch job details
    resp = client.get(f"/api/v1/analysis/{job_id}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["data"]["analysis_type"] == "FREQUENCY"


def test_superadmin_analysis_picks_structure(
    client: TestClient,
    db_session: Session,
) -> None:
    # Create Super Admin user
    sa_email = "suzu@gmail.com"
    sa_user = db_session.query(User).filter_by(email=sa_email).first()
    if not sa_user:
        sa_user = User(email=sa_email, password_hash="hash", is_active=True, is_admin=True, is_superadmin=True)
        db_session.add(sa_user)
        db_session.commit()

    token = _get_user_token(sa_user)
    headers = {"Authorization": f"Bearer {token}"}

    # Add records for Super Admin
    rec_repo = NumberRecordRepository(db_session)
    for num in ["925153", "340909", "182669", "548231", "789123"]:
        rec_repo.create(NumberRecord(user_id=sa_user.id, number=num, is_favorite=False))
    db_session.commit()

    # Create and run analysis
    payload = {
        "analysis_type": "COMPOSITE",
        "parameters": {},
    }
    resp = client.post("/api/v1/analysis/", json=payload, headers=headers)
    assert resp.status_code == 201
    job_data = resp.json()["data"]
    assert job_data["status"] == "COMPLETED"
    res_dict = job_data["result"]["result_data"]

    # Verify Super Admin picks structure:
    # 1. 6D Pick: Exactly 1 set (deterministic Top 58)
    assert "best_analyzed_6d" in res_dict
    assert len(res_dict["best_analyzed_6d"]) == 1

    # 2. No 4D picks for Super Admin
    assert res_dict.get("generated_4d_recommendations") is None

    # 3. 2D Picks: Exactly 3 sets (Rank #2, Rank 58, and Rank 88)
    assert "generated_2d_recommendations" in res_dict
    assert len(res_dict["generated_2d_recommendations"]) == 3

    # 4. CSV Export
    job_id = job_data["id"]
    csv_resp = client.get(f"/api/v1/analysis/{job_id}/export/csv", headers=headers)
    assert csv_resp.status_code == 200
    csv_text = csv_resp.text
    assert "6-Digit Pick" in csv_text
    assert "4-Digit Pick" not in csv_text
    assert "2-Digit Pick" in csv_text


def test_monte_carlo_rl_analysis_job(
    client: TestClient,
    db_session: Session,
) -> None:
    sa_email = "suzu@gmail.com"
    sa_user = db_session.query(User).filter_by(email=sa_email).first()
    if not sa_user:
        sa_user = User(email=sa_email, password_hash="hash", is_active=True, is_admin=True)
        db_session.add(sa_user)
        db_session.commit()

    token = _get_user_token(sa_user)
    headers = {"Authorization": f"Bearer {token}"}

    rec_repo = NumberRecordRepository(db_session)
    for num in ["885812", "588858", "123456", "987654", "555888"]:
        rec_repo.create(NumberRecord(user_id=sa_user.id, number=num, is_favorite=False))
    db_session.commit()

    payload = {
        "analysis_type": "MONTE_CARLO_RL",
        "parameters": {},
    }
    resp = client.post("/api/v1/analysis", json=payload, headers=headers)
    assert resp.status_code == 201
    job_data = resp.json()["data"]
    assert job_data["status"] == "COMPLETED"
    assert job_data["analysis_type"] == "MONTE_CARLO_RL"
    res_dict = job_data["result"]["result_data"]

    # Check Monte Carlo RL specific metrics
    assert "monte_carlo_rl_metrics" in res_dict
    mc = res_dict["monte_carlo_rl_metrics"]
    assert mc["simulations_run"] == 50000
    assert mc["episodes_trained"] == 1000
    assert mc["convergence_rate"] > 90.0
    assert mc["expected_value_multiplier"] >= 1.0

    # Check picks
    assert len(res_dict["best_analyzed_6d"]) == 1
    assert len(res_dict["generated_2d_recommendations"]) == 3
    assert "Lucky Rank 58 VIP" in res_dict["best_analyzed_6d"][0]["tags"]

