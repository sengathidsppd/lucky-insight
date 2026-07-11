"""Tests for Lotteries API endpoints."""

import uuid
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, engine
from app.main import app
from app.models.base import Base
from app.models.lottery_game import LotteryGame
from app.models.lottery_result import LotteryResult
from app.models.user import User

_TABLES = [
    Base.metadata.tables[User.__tablename__],
    Base.metadata.tables[LotteryGame.__tablename__],
    Base.metadata.tables[LotteryResult.__tablename__],
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


def _register_login_and_promote(
    client: TestClient,
    db_session: Session,
    email: str,
) -> str:
    payload = {
        "email": email,
        "password": "SecurePass123",
        "confirm_password": "SecurePass123",
        "first_name": "Ada",
        "last_name": "Lovelace",
    }
    client.post("/api/v1/auth/register", json=payload)

    user = db_session.query(User).filter_by(email=email).one()
    user.is_admin = True
    db_session.commit()

    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "SecurePass123"},
    )
    return login_response.json()["data"]["access_token"]


def test_lottery_game_endpoints(client: TestClient, db_session: Session) -> None:
    # 1. Non-admin token
    normal_email = f"user.{uuid.uuid4()}@example.com"
    normal_token = _register_and_login(client, normal_email)
    normal_headers = {"Authorization": f"Bearer {normal_token}"}

    # 2. Admin token
    admin_email = f"admin.{uuid.uuid4()}@example.com"
    admin_token = _register_login_and_promote(client, db_session, admin_email)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Normal user tries to create game -> 403 Forbidden
    payload = {"name": "Lao Government Test", "code": "LAO_TEST"}
    resp = client.post("/api/v1/lotteries/games", json=payload, headers=normal_headers)
    assert resp.status_code == 403

    # Admin creates game -> 201 Created
    resp = client.post("/api/v1/lotteries/games", json=payload, headers=admin_headers)
    assert resp.status_code == 201
    game_id = resp.json()["data"]["id"]

    # Anyone can fetch games
    resp = client.get("/api/v1/lotteries/games", headers=normal_headers)
    assert resp.status_code == 200
    assert len(resp.json()["data"]) >= 1

    # Fetch detail
    resp = client.get(f"/api/v1/lotteries/games/{game_id}", headers=normal_headers)
    assert resp.status_code == 200
    assert resp.json()["data"]["code"] == "LAO_TEST"


def test_lottery_result_endpoints(client: TestClient, db_session: Session) -> None:
    # Promote admin
    admin_email = f"admin.res.{uuid.uuid4()}@example.com"
    admin_token = _register_login_and_promote(client, db_session, admin_email)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Get game_id
    game_payload = {"name": "Thai Govt", "code": "THAI_API"}
    game_resp = client.post(
        "/api/v1/lotteries/games",
        json=game_payload,
        headers=admin_headers,
    )
    game_id = game_resp.json()["data"]["id"]

    # Submit result
    result_payload = {
        "game_id": game_id,
        "draw_date": "2026-07-16",
        "draw_number": "Draw 12",
        "first_prize": "999999",
        "last2": "99",
        "front3": "123,456",
        "back3": "789,012",
    }
    resp = client.post(
        "/api/v1/lotteries/results",
        json=result_payload,
        headers=admin_headers,
    )
    assert resp.status_code == 201
    result_id = resp.json()["data"]["id"]

    # Fetch latest result
    resp = client.get(
        "/api/v1/lotteries/results/latest",
        params={"game_id": game_id},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["first_prize"] == "999999"

    # List results for game
    resp = client.get(
        "/api/v1/lotteries/results",
        params={"game_id": game_id},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert len(resp.json()["data"]) == 1

    # Fetch detail
    resp = client.get(
        f"/api/v1/lotteries/results/{result_id}",
        headers=admin_headers,
    )
    assert resp.status_code == 200

    # Update result
    resp = client.patch(
        f"/api/v1/lotteries/results/{result_id}",
        json={"first_prize": "888888"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["first_prize"] == "888888"

    # Delete result
    resp = client.delete(
        f"/api/v1/lotteries/results/{result_id}",
        headers=admin_headers,
    )
    assert resp.status_code == 200
