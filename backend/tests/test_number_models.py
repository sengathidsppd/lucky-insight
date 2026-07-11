"""Tests for the number and tagging ORM models.

These tests exercise validation rules, default fields, and relationships
for NumberSource, NumberCategory, NumberTag, and NumberRecord.
"""

from collections.abc import Generator

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, engine
from app.models.base import Base
from app.models.number_category import NumberCategory
from app.models.number_record import NumberRecord
from app.models.number_source import NumberSource
from app.models.number_tag import NumberTag
from app.models.user import User

# List of tables needed for these tests, ordered by dependency
_TABLES = [
    Base.metadata.tables[User.__tablename__],
    Base.metadata.tables[NumberSource.__tablename__],
    Base.metadata.tables[NumberCategory.__tablename__],
    Base.metadata.tables[NumberTag.__tablename__],
    Base.metadata.tables[NumberRecord.__tablename__],
    Base.metadata.tables["record_tags"],
]


@pytest.fixture(scope="module", autouse=True)
def _setup_tables() -> Generator[None]:
    """Create all required tables for this test module, then drop them."""
    Base.metadata.create_all(bind=engine, tables=_TABLES)
    yield
    Base.metadata.drop_all(bind=engine, tables=list(reversed(_TABLES)))


@pytest.fixture
def db_session() -> Generator[Session]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


def _get_user(db_session: Session) -> User:
    """Helper to get or create a test user."""
    user = db_session.query(User).filter_by(email="test.number@example.com").first()
    if not user:
        user = User(email="test.number@example.com", password_hash="hash")
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    return user


def test_number_source_validation() -> None:
    """NumberSource name validation behaves correctly."""
    with pytest.raises(ValueError, match="cannot be empty"):
        NumberSource(name="")

    with pytest.raises(ValueError, match="100 characters or fewer"):
        NumberSource(name="a" * 101)

    source = NumberSource(name="Car Plate", description="License plates")
    assert source.name == "Car Plate"
    assert source.description == "License plates"


def test_number_category_validation() -> None:
    """NumberCategory name validation behaves correctly."""
    with pytest.raises(ValueError, match="cannot be empty"):
        NumberCategory(name="  ")

    with pytest.raises(ValueError, match="100 characters or fewer"):
        NumberCategory(name="a" * 101)


def test_number_tag_validation(db_session: Session) -> None:
    """NumberTag name validation behaves correctly and user_id/name is unique."""
    user = _get_user(db_session)
    with pytest.raises(ValueError, match="cannot be empty"):
        NumberTag(user_id=user.id, name="")

    tag1 = NumberTag(user_id=user.id, name="Lucky")
    db_session.add(tag1)
    db_session.commit()

    tag2 = NumberTag(user_id=user.id, name="Lucky")
    db_session.add(tag2)
    with pytest.raises(IntegrityError):
        db_session.commit()


def test_number_record_validation(db_session: Session) -> None:
    """NumberRecord validation and relations behave correctly."""
    user = _get_user(db_session)

    with pytest.raises(ValueError, match="cannot be empty"):
        NumberRecord(user_id=user.id, number="")

    with pytest.raises(ValueError, match="20 characters or fewer"):
        NumberRecord(user_id=user.id, number="1" * 21)

    record = NumberRecord(user_id=user.id, number="999", note="very lucky")
    db_session.add(record)
    db_session.commit()
    db_session.refresh(record)

    assert record.id is not None
    assert record.number == "999"
    assert record.note == "very lucky"
    assert record.is_favorite is False
    assert record.recorded_at is not None
