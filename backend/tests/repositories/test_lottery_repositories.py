"""Tests for the lottery-related repositories."""

from collections.abc import Generator
from datetime import date

import pytest
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, engine
from app.models.base import Base
from app.models.lottery_game import LotteryGame
from app.models.lottery_result import LotteryResult
from app.models.user import User
from app.repositories.lottery_game_repository import LotteryGameRepository
from app.repositories.lottery_result_repository import LotteryResultRepository

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


def test_lottery_game_repository(db_session: Session) -> None:
    """LotteryGameRepository manages game queries correctly."""
    repo = LotteryGameRepository(db_session)
    game = LotteryGame(name="Thai Govt Lottery", code="THAI_REPO")
    repo.create(game)
    db_session.commit()

    fetched = repo.get_by_code("thai_repo")
    assert fetched is not None
    assert fetched.name == "Thai Govt Lottery"


def test_lottery_result_repository(db_session: Session) -> None:
    """LotteryResultRepository manages draw query operations correctly."""
    game_repo = LotteryGameRepository(db_session)
    result_repo = LotteryResultRepository(db_session)

    game = LotteryGame(name="Lao Development", code="LAO_REPO")
    game_repo.create(game)
    db_session.commit()

    res1 = LotteryResult(
        game_id=game.id,
        draw_date=date(2026, 7, 10),
        first_prize="111111",
    )
    res2 = LotteryResult(
        game_id=game.id,
        draw_date=date(2026, 7, 11),
        first_prize="222222",
    )
    result_repo.create(res1)
    result_repo.create(res2)
    db_session.commit()

    # Test get_by_game_and_date
    fetched = result_repo.get_by_game_and_date(game.id, date(2026, 7, 11))
    assert fetched is not None
    assert fetched.first_prize == "222222"

    # Test get_latest_draw
    latest = result_repo.get_latest_draw(game.id)
    assert latest is not None
    assert latest.draw_date == date(2026, 7, 11)

    # Test list_by_game
    items = result_repo.list_by_game(game.id, limit=10, offset=0)
    assert len(items) == 2
    assert items[0].draw_date == date(2026, 7, 11)
