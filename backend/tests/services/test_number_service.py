"""Tests for NumberRecordService.

Exercises service-layer business logic, validation enforcement,
and user-ownership boundaries.
"""

import uuid
from collections.abc import Generator

import pytest
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, engine
from app.models.base import Base
from app.models.number_category import NumberCategory
from app.models.number_record import NumberRecord
from app.models.number_source import NumberSource
from app.models.number_tag import NumberTag
from app.models.user import User
from app.repositories.exceptions import EntityNotFoundError
from app.repositories.lookup_repository import LookupRepository
from app.repositories.number_record_repository import NumberRecordRepository
from app.repositories.number_tag_repository import NumberTagRepository
from app.services.exceptions import InvalidRecordDataError, RecordOwnershipError
from app.services.number_record_service import NumberRecordService

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


@pytest.fixture
def test_user(db_session: Session) -> User:
    user = User(email=f"service.{uuid.uuid4()}@example.com", password_hash="hash")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def other_user(db_session: Session) -> User:
    user = User(email=f"service.other.{uuid.uuid4()}@example.com", password_hash="hash")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def record_service(db_session: Session) -> NumberRecordService:
    return NumberRecordService(
        record_repository=NumberRecordRepository(db_session),
        tag_repository=NumberTagRepository(db_session),
        lookup_repository=LookupRepository(db_session),
    )


def test_create_record_validation(
    db_session: Session,
    test_user: User,
    record_service: NumberRecordService,
) -> None:
    """Service validates lookup IDs before creating a record."""
    # Test invalid source_id
    with pytest.raises(InvalidRecordDataError, match="Invalid number source ID"):
        record_service.create_record(test_user.id, "123", source_id=uuid.uuid4())

    # Test invalid category_id
    with pytest.raises(InvalidRecordDataError, match="Invalid number category ID"):
        record_service.create_record(test_user.id, "123", category_id=uuid.uuid4())

    # Test invalid tag_id
    with pytest.raises(InvalidRecordDataError, match="One or more tag IDs are invalid"):
        record_service.create_record(test_user.id, "123", tag_ids=[uuid.uuid4()])


def test_create_and_get_record(
    db_session: Session,
    test_user: User,
    record_service: NumberRecordService,
) -> None:
    """A record can be created, retrieved, and managed."""
    # Create tag
    tag = record_service.create_tag(test_user.id, "Work")
    db_session.commit()

    # Create record
    rec = record_service.create_record(
        test_user.id,
        "789",
        tag_ids=[tag.id],
        note="from boss",
    )
    db_session.commit()

    # Fetch
    fetched = record_service.get_record(test_user.id, rec.id)
    assert fetched.number == "789"
    assert fetched.note == "from boss"
    assert fetched.tags[0].name == "Work"


def test_ownership_enforcement(
    db_session: Session,
    test_user: User,
    other_user: User,
    record_service: NumberRecordService,
) -> None:
    """Users cannot update, delete, or fetch another user's record."""
    rec = record_service.create_record(test_user.id, "555")
    db_session.commit()

    # Other user tries to read
    with pytest.raises(EntityNotFoundError):
        record_service.get_record(other_user.id, rec.id)

    # Other user tries to update
    with pytest.raises(RecordOwnershipError):
        record_service.update_record(other_user.id, rec.id, number="666")

    # Other user tries to delete
    with pytest.raises(RecordOwnershipError):
        record_service.delete_record(other_user.id, rec.id)
