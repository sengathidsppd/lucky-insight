"""Tests for database connectivity, session creation, and the database
health endpoint.

These tests exercise the real SQLAlchemy engine configured from
``DATABASE_URL``. They do not create, modify, or drop any tables.
"""

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, engine
from app.main import app
from app.services.health_service import (
    DatabaseUnavailableError,
    check_database_connection,
)

client = TestClient(app)


def test_database_connection_succeeds() -> None:
    """The configured engine can open a connection and run a query."""
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        assert result.scalar() == 1


def test_session_creation_and_close() -> None:
    """SessionLocal produces a usable, closeable ORM session."""
    session = SessionLocal()
    try:
        assert isinstance(session, Session)
        result = session.execute(text("SELECT 1"))
        assert result.scalar() == 1
    finally:
        session.close()


def test_check_database_connection_succeeds() -> None:
    """The health service reports success without raising when DB is up."""
    check_database_connection()


def test_check_database_connection_raises_on_failure() -> None:
    """The health service raises DatabaseUnavailableError on connection failure."""
    with (
        patch("app.services.health_service.SessionLocal") as mock_session_local,
        pytest.raises(DatabaseUnavailableError),
    ):
        mock_session = mock_session_local.return_value
        mock_session.execute.side_effect = OperationalError("SELECT 1", {}, Exception("boom"))
        check_database_connection()


def test_database_health_endpoint_returns_200_when_connected() -> None:
    """GET /health/database returns HTTP 200 and connected status."""
    response = client.get("/health/database")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "connected"}


def test_database_health_endpoint_returns_503_when_disconnected() -> None:
    """GET /health/database returns HTTP 503 when the database is unreachable."""
    with patch(
        "app.api.health.check_database_connection",
        side_effect=DatabaseUnavailableError("Database connection failed"),
    ):
        response = client.get("/health/database")
        assert response.status_code == 503
        assert response.json() == {"status": "error", "database": "disconnected"}


def test_health_endpoint_still_returns_200() -> None:
    """GET /health remains unaffected by the database health endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "1.0.0"}
