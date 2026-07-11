"""Tests for ImportExportService."""

import uuid
from collections.abc import Generator

import pytest
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, engine
from app.models.base import Base
from app.models.number_record import NumberRecord
from app.models.user import User
from app.repositories.number_record_repository import NumberRecordRepository
from app.services.import_export_service import ImportExportService

_TABLES = [
    Base.metadata.tables[User.__tablename__],
    Base.metadata.tables[NumberRecord.__tablename__],
]


@pytest.fixture(scope="module", autouse=True)
def _setup_tables() -> Generator[None]:
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session() -> Generator[Session]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def import_export_service(db_session: Session) -> ImportExportService:
    return ImportExportService(
        session=db_session,
        record_repository=NumberRecordRepository(db_session),
    )


def test_import_and_export_csv(
    db_session: Session,
    import_export_service: ImportExportService,
) -> None:
    # Create user
    user = User(email=f"importer.{uuid.uuid4()}@example.com", password_hash="hash")
    db_session.add(user)
    db_session.commit()

    # Import from CSV bytes
    csv_content = (
        b"number,source,category,note,is_favorite,recorded_at,tags\n"
        b"9876,Dream,Lottery,Nice dream,true,2026-07-11T12:00:00,\"night,lucky\"\n"
        b",Empty,,Empty number,false,,,\n"
    )

    result = import_export_service.import_records_from_csv(user.id, csv_content)
    db_session.commit()

    assert result["imported_count"] == 1
    assert result["failed_count"] == 1
    assert len(result["errors"]) == 1
    assert "empty" in result["errors"][0].error.lower()

    # Verify database
    rec_repo = NumberRecordRepository(db_session)
    records, count = rec_repo.search(user.id)
    assert count == 1
    assert records[0].number == "9876"
    assert records[0].category.name == "Lottery"
    assert records[0].source.name == "Dream"
    assert records[0].is_favorite is True
    assert len(records[0].tags) == 2

    # Export to CSV
    csv_string = import_export_service.export_records_to_csv(user.id)
    assert "9876" in csv_string
    assert "Nice dream" in csv_string
    assert "night,lucky" in csv_string or "lucky,night" in csv_string
