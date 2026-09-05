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
    assert "records" in job_freq.result.explanation

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


def test_deterministic_analysis_across_users_option_b(
    db_session: Session,
    analysis_service: AnalysisService,
) -> None:
    from datetime import date
    from app.repositories.lottery_game_repository import LotteryGameRepository

    # 1. Create a lottery game
    game_repo = LotteryGameRepository(db_session)
    game = LotteryGame(name="Lao Development Lottery", code=f"LAO_{uuid.uuid4().hex[:6]}")
    game_repo.create(game)
    db_session.commit()

    # 2. Add official draw results for the game
    res_repo = LotteryResultRepository(db_session)
    r1 = LotteryResult(
        game_id=game.id,
        draw_date=date(2026, 9, 1),
        draw_number="001",
        first_prize="925153",
        last2="53",
        last4="5153",
    )
    r2 = LotteryResult(
        game_id=game.id,
        draw_date=date(2026, 9, 3),
        draw_number="002",
        first_prize="340909",
        last2="09",
        last4="0909",
    )
    r3 = LotteryResult(
        game_id=game.id,
        draw_date=date(2026, 9, 5),
        draw_number="003",
        first_prize="182669",
        last2="69",
        last4="2669",
    )
    res_repo.create(r1)
    res_repo.create(r2)
    res_repo.create(r3)
    db_session.commit()

    # 3. Create User A (who has personal records) and User B (who has NO personal records)
    user_a = User(email=f"usera.{uuid.uuid4()}@example.com", password_hash="hash")
    user_b = User(email=f"userb.{uuid.uuid4()}@example.com", password_hash="hash")
    db_session.add(user_a)
    db_session.add(user_b)
    db_session.commit()

    # Add personal records for User A
    rec_repo = NumberRecordRepository(db_session)
    for num in ["999999", "777777", "888888"]:
        rec_repo.create(NumberRecord(user_id=user_a.id, number=num, is_favorite=False))
    db_session.commit()

    # 4. Run Analysis for User A and User B on the same lottery game
    params = {"game_id": str(game.id)}
    job_a = analysis_service.create_and_run_analysis(user_a.id, "COMPOSITE", parameters=params)
    job_b = analysis_service.create_and_run_analysis(user_b.id, "COMPOSITE", parameters=params)
    db_session.commit()

    # 5. Verify 100% Deterministic Equality between User A and User B
    res_a = job_a.result.result_data
    res_b = job_b.result.result_data

    # Both must have identical 6D top picks
    assert res_a["best_analyzed_6d"][0]["number"] == res_b["best_analyzed_6d"][0]["number"]
    assert res_a["best_analyzed_6d"][0]["score"] == res_b["best_analyzed_6d"][0]["score"]
    assert res_a["generated_recommendations"] == res_b["generated_recommendations"]

    # Both must have identical 2D picks
    assert [x["number"] for x in res_a["generated_2d_recommendations"]] == [
        x["number"] for x in res_b["generated_2d_recommendations"]
    ]

    # Both must have identical 3D picks
    assert [x["number"] for x in res_a["generated_3d_recommendations"]] == [
        x["number"] for x in res_b["generated_3d_recommendations"]
    ]

    # 6. Verify Deterministic Consistency on consecutive runs by the same user
    job_a2 = analysis_service.create_and_run_analysis(user_a.id, "COMPOSITE", parameters=params)
    db_session.commit()
    res_a2 = job_a2.result.result_data

    assert res_a["best_analyzed_6d"][0]["number"] == res_a2["best_analyzed_6d"][0]["number"]
    assert [x["number"] for x in res_a["generated_2d_recommendations"]] == [
        x["number"] for x in res_a2["generated_2d_recommendations"]
    ]
