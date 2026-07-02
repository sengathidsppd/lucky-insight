"""Database health check business logic.

Contains the logic used to verify that the application can successfully
reach the configured PostgreSQL database. This module intentionally knows
nothing about HTTP; it simply reports connectivity status so the API layer
can translate that into an HTTP response.
"""

from sqlalchemy import text
from sqlalchemy.exc import OperationalError, ProgrammingError

from app.core.database import SessionLocal
from app.core.logging import get_logger

logger = get_logger(__name__)


class DatabaseUnavailableError(Exception):
    """Raised when the database cannot be reached or queried."""


def check_database_connection() -> None:
    """Verify database connectivity by executing a lightweight query.

    Raises:
        DatabaseUnavailableError: If the database connection or query
            fails for any reason (connection issue, timeout, or invalid
            query against the server).
    """
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
    except (OperationalError, ProgrammingError, TimeoutError) as exc:
        logger.error("Database connection failed: %s", exc.__class__.__name__)
        raise DatabaseUnavailableError("Database connection failed") from exc
    else:
        logger.info("Database connection check succeeded")
    finally:
        db.close()
