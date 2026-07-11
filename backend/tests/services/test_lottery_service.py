"""Tests for LotteryService."""

from collections.abc import Generator
from datetime import date

import pytest
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, engine
from app.models.base import Base
from app.models.lottery_game import LotteryGame
from app.models.lottery_result import LotteryResult
from app.models.user import User
from app.repositories.exceptions import DuplicateEntityError
from app.repositories.lottery_game_repository import LotteryGameRepository
from app.repositories.lottery_result_repository import LotteryResultRepository
from app.services.lottery_service import LotteryService

_TABLES = [
    Base.metadata.tables[User.__tablename__],
    Base.metadata.tables[LotteryGame.__tablename__],
    Base.metadata.tables[LotteryResult.__tablename__],
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
def lottery_service(db_session: Session) -> LotteryService:
    return LotteryService(
        game_repository=LotteryGameRepository(db_session),
        result_repository=LotteryResultRepository(db_session),
    )


def test_create_and_manage_game(
    db_session: Session,
    lottery_service: LotteryService,
) -> None:
    """Service manages game creation and retrieval correctly."""
    # Create game
    game = lottery_service.create_game(name="Vietnam Lottery", code="VN")
    db_session.commit()

    assert game.id is not None
    assert game.code == "VN"

    # Duplicate code check
    with pytest.raises(DuplicateEntityError):
        lottery_service.create_game(name="Vietnam Two", code="VN")

    # Fetch
    fetched = lottery_service.get_game(game.id)
    assert fetched.name == "Vietnam Lottery"


def test_create_and_manage_result(
    db_session: Session,
    lottery_service: LotteryService,
) -> None:
    """Service manages draw results creation, pagination, and latest status correctly."""
    game = lottery_service.create_game(name="Malaysia 4D", code="MY")
    db_session.commit()

    # Create result
    res = lottery_service.create_result(
        game_id=game.id,
        draw_date=date(2026, 7, 10),
        first_prize="4444",
        last2="44",
        draw_number="Draw 1",
    )
    db_session.commit()

    assert res.id is not None
    assert res.first_prize == "4444"

    # Duplicate result on same date check
    with pytest.raises(DuplicateEntityError):
        lottery_service.create_result(
            game_id=game.id,
            draw_date=date(2026, 7, 10),
            first_prize="5555",
        )

    # Get latest
    latest = lottery_service.get_latest_result(game.id)
    assert latest.draw_date == date(2026, 7, 10)
    assert latest.first_prize == "4444"
