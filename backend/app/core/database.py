"""Database engine and session configuration.

This module wires up the SQLAlchemy engine and session factory used across
the application. It intentionally contains no business logic and does not
create any tables; table creation is handled exclusively through Alembic
migrations.

The declarative ``Base`` class lives in ``app.models.base`` (not here) so
that the models package owns the single source of truth for ORM metadata.
"""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_recycle=1800,
    pool_pre_ping=True,
    future=True,
    echo=False,
)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    future=True,
)


def get_db() -> Generator[Session]:
    """Yield a database session for use as a FastAPI dependency.

    The session is always closed once the request has finished, even if
    an exception is raised while handling it.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
