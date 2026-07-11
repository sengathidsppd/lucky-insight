"""Tests for AnalysisService."""

import uuid
from collections.abc import Generator

import pytest
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, engine
from app.models.analysis_job import AnalysisJob
from app.models.analysis_result import AnalysisResult
from app.models.base import Base
from app.models.lottery_game import LotteryGame
from app.models.lottery_result import LotteryResult
from app.models.number_record import NumberRecord
from app.models.user import User
from app.repositories.analysis_repository import AnalysisRepository
from app.repositories.lottery_result_repository import LotteryResultRepository
from app.repositories.number_record_repository import NumberRecordRepository
from app.services.analysis_service import AnalysisService

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
def db_session() -> Generator[Session]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def analysis_service(db_session: Session) -> AnalysisService:
    return AnalysisService(
        analysis_repository=AnalysisRepository(db_session),
        record_repository=NumberRecordRepository(db_session),
        lottery_result_repository=LotteryResultRepository(db_session),
    )


def test_analysis_service_calculations(
    db_session: Session,
    analysis_service: AnalysisService,
) -> None:
    # 1. Create a user
    user = User(email=f"tester.{uuid.uuid4()}@example.com", password_hash="hash")
    db_session.add(user)
    db_session.commit()

    # 2. Add records
    rec_repo = NumberRecordRepository(db_session)
    rec1 = NumberRecord(user_id=user.id, number="123", is_favorite=False)
    rec2 = NumberRecord(user_id=user.id, number="124", is_favorite=False)
    rec_repo.create(rec1)
    rec_repo.create(rec2)
    db_session.commit()

    # Run Frequency
    job_freq = analysis_service.create_and_run_analysis(user.id, "FREQUENCY")
    db_session.commit()
    assert job_freq.status == "COMPLETED"
    assert job_freq.result is not None
    assert job_freq.result.result_data["total_records_analyzed"] == 2
    assert "single digit is" in job_freq.result.explanation

    # Run Pairs
    job_pair = analysis_service.create_and_run_analysis(user.id, "PAIR")
    db_session.commit()
    assert job_pair.status == "COMPLETED"
    assert job_pair.result is not None
    assert len(job_freq.result.result_data["top_single_digits"]) > 0

    # Run Distribution
    job_dist = analysis_service.create_and_run_analysis(user.id, "DISTRIBUTION")
    db_session.commit()
    assert job_dist.status == "COMPLETED"
    assert job_dist.result is not None
    assert job_dist.result.result_data["odd_percentage"] > 0
