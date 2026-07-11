"""Tests for the Lottery ORM models."""

from collections.abc import Generator
from datetime import date

import pytest
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, engine
from app.models.base import Base
from app.models.lottery_game import LotteryGame
from app.models.lottery_result import LotteryResult
from app.models.user import User

_TABLES = [
    Base.metadata.tables[User.__tablename__],
    Base.metadata.tables[LotteryGame.__tablename__],
    Base.metadata.tables[LotteryResult.__tablename__],
]


@pytest.fixture(scope="module", autouse=True)
def _setup_tables() -> Generator[None]:
    """Create all required tables for this test module, then drop them in reverse order."""
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


def test_lottery_game_validation() -> None:
    """LotteryGame validates properties correctly."""
    with pytest.raises(ValueError, match="name cannot be empty"):
        LotteryGame(name="", code="THAI")

    with pytest.raises(ValueError, match="code cannot be empty"):
        LotteryGame(name="Thai", code="")

    game = LotteryGame(name="Lao Development Lottery", code="lao")
    assert game.code == "LAO"


def test_lottery_result_validation(db_session: Session) -> None:
    """LotteryResult validates properties correctly."""
    game = LotteryGame(name="Test Game", code="TEST")
    db_session.add(game)
    db_session.commit()

    with pytest.raises(ValueError, match="first_prize cannot be empty"):
        LotteryResult(game_id=game.id, draw_date=date.today(), first_prize="")

    with pytest.raises(ValueError, match="last2 must be 10 characters or fewer"):
        LotteryResult(
            game_id=game.id,
            draw_date=date.today(),
            first_prize="123456",
            last2="12345678901",
        )

    res = LotteryResult(
        game_id=game.id,
        draw_date=date.today(),
        first_prize="123456",
        last2="58",
        front3="123,456",
        back3="789,012",
    )
    db_session.add(res)
    db_session.commit()
    db_session.refresh(res)

    assert res.id is not None
    assert res.game.name == "Test Game"
