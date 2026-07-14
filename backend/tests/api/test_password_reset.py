"""Tests for Password Reset API endpoints."""

import uuid
from collections.abc import Generator
from datetime import datetime, timedelta, UTC

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, engine
from app.main import app
from app.models.base import Base
from app.models.user import User
from app.models.password_reset_token import PasswordResetToken
from app.security.password import verify_password

_TABLES = [
    Base.metadata.tables[User.__tablename__],
    Base.metadata.tables[PasswordResetToken.__tablename__],
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


def test_forgot_password_unregistered_email(client: TestClient) -> None:
    payload = {"email": "notfound@example.com"}
    response = client.post("/api/v1/auth/forgot-password", json=payload)
    assert response.status_code == 200
    assert response.json()["success"] is True


def test_forgot_password_registered_email(
    client: TestClient, db_session: Session
) -> None:
    # 1. Create a user
    email = f"reset.{uuid.uuid4()}@example.com"
    user = User(email=email, password_hash="oldhash")
    db_session.add(user)
    db_session.commit()

    # 2. Trigger forgot password
    payload = {"email": email}
    response = client.post("/api/v1/auth/forgot-password", json=payload)
    assert response.status_code == 200
    assert response.json()["success"] is True

    # 3. Verify token exists in database
    token_record = db_session.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).first()
    assert token_record is not None
    assert token_record.is_used is False
    assert token_record.expires_at > datetime.now(UTC)


def test_reset_password_success(
    client: TestClient, db_session: Session
) -> None:
    # 1. Create a user
    email = f"reset.{uuid.uuid4()}@example.com"
    user = User(email=email, password_hash="oldhash")
    db_session.add(user)
    db_session.commit()

    # 2. Create a reset token
    token = "valid-token-123"
    reset_token = PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=datetime.now(UTC) + timedelta(minutes=15),
        is_used=False,
    )
    db_session.add(reset_token)
    db_session.commit()

    # 3. Perform reset
    payload = {"token": token, "new_password": "NewSecurePassword123"}
    response = client.post("/api/v1/auth/reset-password", json=payload)
    assert response.status_code == 200
    assert response.json()["success"] is True

    # 4. Verify password updated
    db_session.refresh(user)
    db_session.refresh(reset_token)
    assert verify_password("NewSecurePassword123", user.password_hash) is True
    assert reset_token.is_used is True


def test_reset_password_expired_token(
    client: TestClient, db_session: Session
) -> None:
    # 1. Create user and expired token
    email = f"reset.{uuid.uuid4()}@example.com"
    user = User(email=email, password_hash="oldhash")
    db_session.add(user)
    db_session.commit()

    token = "expired-token-123"
    reset_token = PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=datetime.now(UTC) - timedelta(minutes=5),
        is_used=False,
    )
    db_session.add(reset_token)
    db_session.commit()

    # 2. Reset attempt should fail
    payload = {"token": token, "new_password": "NewSecurePassword123"}
    response = client.post("/api/v1/auth/reset-password", json=payload)
    assert response.status_code == 400
    assert "expired" in response.json()["detail"]


def test_reset_password_already_used_token(
    client: TestClient, db_session: Session
) -> None:
    # 1. Create user and already used token
    email = f"reset.{uuid.uuid4()}@example.com"
    user = User(email=email, password_hash="oldhash")
    db_session.add(user)
    db_session.commit()

    token = "used-token-123"
    reset_token = PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=datetime.now(UTC) + timedelta(minutes=15),
        is_used=True,
    )
    db_session.add(reset_token)
    db_session.commit()

    # 2. Reset attempt should fail
    payload = {"token": token, "new_password": "NewSecurePassword123"}
    response = client.post("/api/v1/auth/reset-password", json=payload)
    assert response.status_code == 400
    assert "already used" in response.json()["detail"]
