"""Tests for the number-related repositories.

Exercises database operations in LookupRepository, NumberTagRepository,
and NumberRecordRepository.
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
from app.repositories.exceptions import DuplicateEntityError
from app.repositories.lookup_repository import LookupRepository
from app.repositories.number_record_repository import NumberRecordRepository
from app.repositories.number_tag_repository import NumberTagRepository

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
    user = User(email=f"repo.{uuid.uuid4()}@example.com", password_hash="hash")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def test_lookup_repository(db_session: Session) -> None:
    """LookupRepository can retrieve predefined categories and sources."""
    # Seed a source and a category
    src = NumberSource(name="Test Source", description="desc")
    cat = NumberCategory(name="Test Category", description="desc")
    db_session.add(src)
    db_session.add(cat)
    db_session.commit()

    repo = LookupRepository(db_session)
    sources = repo.get_all_sources()
    categories = repo.get_all_categories()

    assert any(s.name == "Test Source" for s in sources)
    assert any(c.name == "Test Category" for c in categories)

    assert repo.get_source_by_id(src.id) is not None
    assert repo.get_category_by_id(cat.id) is not None


def test_number_tag_repository(db_session: Session, test_user: User) -> None:
    """NumberTagRepository manages user tags successfully."""
    repo = NumberTagRepository(db_session)
    tag1 = NumberTag(user_id=test_user.id, name="Family")
    repo.create_tag(tag1)
    db_session.commit()

    # Test duplicate creation throws error
    with pytest.raises(DuplicateEntityError):
        repo.create_tag(NumberTag(user_id=test_user.id, name="Family"))

    # Test get_by_user
    tags = repo.get_by_user(test_user.id)
    assert len(tags) == 1
    assert tags[0].name == "Family"

    # Test get_by_user_and_name
    assert repo.get_by_user_and_name(test_user.id, "Family") is not None
    assert repo.get_by_user_and_name(test_user.id, "NonExistent") is None


def test_number_record_repository(db_session: Session, test_user: User) -> None:
    """NumberRecordRepository manages CRUD, pagination, search, and favorites."""
    record_repo = NumberRecordRepository(db_session)
    tag_repo = NumberTagRepository(db_session)

    tag = NumberTag(user_id=test_user.id, name="Travel")
    tag_repo.create_tag(tag)
    db_session.commit()

    # Create record
    rec = NumberRecord(user_id=test_user.id, number="123", note="spotted on highway")
    rec.tags = [tag]
    record_repo.create(rec)
    db_session.commit()

    # Retrieve
    fetched = record_repo.get_by_user_and_id(test_user.id, rec.id)
    assert fetched is not None
    assert fetched.number == "123"
    assert len(fetched.tags) == 1
    assert fetched.tags[0].name == "Travel"

    # Favorite
    record_repo.set_favorite(rec.id, test_user.id, is_favorite=True)
    db_session.commit()
    db_session.refresh(rec)
    assert rec.is_favorite is True

    # Search
    results, total = record_repo.search(test_user.id, number="12", is_favorite=True)
    assert total == 1
    assert results[0].number == "123"

    results, total = record_repo.search(test_user.id, keyword="highway")
    assert total == 1

    results, total = record_repo.search(test_user.id, tag_ids=[tag.id])
    assert total == 1
