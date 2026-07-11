"""Repository for LotteryResult entity."""

import uuid
from collections.abc import Sequence
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.models.lottery_result import LotteryResult
from app.repositories.base_repository import BaseRepository
from app.repositories.exceptions import RepositoryError

logger = get_logger(__name__)


class LotteryResultRepository(BaseRepository[LotteryResult]):
    """Data access layer for LotteryResult."""

    def __init__(self, session: Session) -> None:
        """Initialize with database session.

        Args:
            session: Active SQLAlchemy session.
        """
        super().__init__(session, LotteryResult)

    def get_by_game_and_date(
        self,
        game_id: uuid.UUID,
        draw_date: date,
        *,
        include_deleted: bool = False,
    ) -> LotteryResult | None:
        """Fetch a single draw outcome by game and draw date.

        Args:
            game_id: The UUID of the lottery game.
            draw_date: The date of the draw.
            include_deleted: If True, soft-deleted rows are also considered.

        Returns:
            The matching LotteryResult, or None.

        Raises:
            RepositoryError: If the query fails.
        """
        try:
            stmt = (
                select(LotteryResult)
                .where(LotteryResult.game_id == game_id)
                .where(LotteryResult.draw_date == draw_date)
            )
            if not include_deleted:
                stmt = stmt.where(LotteryResult.deleted_at.is_(None))
            return self._session.execute(stmt).scalar_one_or_none()
        except SQLAlchemyError as exc:
            logger.error(
                "Database error in get_by_game_and_date: %s",
                exc.__class__.__name__,
            )
            raise RepositoryError("Failed to fetch LotteryResult by game and date") from exc

    def list_by_game(
        self,
        game_id: uuid.UUID,
        *,
        limit: int = 20,
        offset: int = 0,
        include_deleted: bool = False,
    ) -> Sequence[LotteryResult]:
        """Fetch results for a specific game, sorted by draw date descending.

        Args:
            game_id: The UUID of the lottery game.
            limit: Maximum number of rows to return.
            offset: Number of rows to skip.
            include_deleted: If True, soft-deleted rows are also included.

        Returns:
            A list of LotteryResult entities.

        Raises:
            RepositoryError: If the query fails.
        """
        try:
            stmt = (
                select(LotteryResult)
                .where(LotteryResult.game_id == game_id)
                .order_by(LotteryResult.draw_date.desc())
                .offset(offset)
                .limit(limit)
            )
            if not include_deleted:
                stmt = stmt.where(LotteryResult.deleted_at.is_(None))
            return self._session.execute(stmt).scalars().all()
        except SQLAlchemyError as exc:
            logger.error(
                "Database error in list_by_game: %s",
                exc.__class__.__name__,
            )
            raise RepositoryError("Failed to fetch LotteryResult list") from exc

    def count_by_game(self, game_id: uuid.UUID, *, include_deleted: bool = False) -> int:
        """Count results for a specific game.

        Args:
            game_id: The UUID of the lottery game.
            include_deleted: If True, soft-deleted rows are also counted.

        Returns:
            The count of results.

        Raises:
            RepositoryError: If the query fails.
        """
        try:
            stmt = (
                select(func.count())
                .select_from(LotteryResult)
                .where(LotteryResult.game_id == game_id)
            )
            if not include_deleted:
                stmt = stmt.where(LotteryResult.deleted_at.is_(None))
            result = self._session.execute(stmt).scalar_one()
            return int(result)
        except SQLAlchemyError as exc:
            logger.error(
                "Database error in count_by_game: %s",
                exc.__class__.__name__,
            )
            raise RepositoryError("Failed to count LotteryResult") from exc

    def get_latest_draw(
        self,
        game_id: uuid.UUID,
        *,
        include_deleted: bool = False,
    ) -> LotteryResult | None:
        """Fetch the most recent draw outcome for a game.

        Args:
            game_id: The UUID of the lottery game.
            include_deleted: If True, soft-deleted rows are also considered.

        Returns:
            The latest LotteryResult, or None.

        Raises:
            RepositoryError: If the query fails.
        """
        try:
            stmt = (
                select(LotteryResult)
                .where(LotteryResult.game_id == game_id)
                .order_by(LotteryResult.draw_date.desc())
                .limit(1)
            )
            if not include_deleted:
                stmt = stmt.where(LotteryResult.deleted_at.is_(None))
            return self._session.execute(stmt).scalars().first()
        except SQLAlchemyError as exc:
            logger.error(
                "Database error in get_latest_draw: %s",
                exc.__class__.__name__,
            )
            raise RepositoryError("Failed to fetch latest LotteryResult") from exc
