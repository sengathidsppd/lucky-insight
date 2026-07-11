"""Repository for LotteryGame entity."""

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.models.lottery_game import LotteryGame
from app.repositories.base_repository import BaseRepository
from app.repositories.exceptions import RepositoryError

logger = get_logger(__name__)


class LotteryGameRepository(BaseRepository[LotteryGame]):
    """Data access layer for LotteryGame."""

    def __init__(self, session: Session) -> None:
        """Initialize with database session.

        Args:
            session: Active SQLAlchemy session.
        """
        super().__init__(session, LotteryGame)

    def get_by_code(self, code: str, *, include_deleted: bool = False) -> LotteryGame | None:
        """Fetch a single lottery game by its unique uppercase code.

        Args:
            code: The unique identifier code (e.g. 'THAI', 'LAO').
            include_deleted: If True, soft-deleted rows are also considered.

        Returns:
            The matching LotteryGame entity, or None.

        Raises:
            RepositoryError: If the query fails.
        """
        try:
            stmt = select(LotteryGame).where(LotteryGame.code == code.strip().upper())
            if not include_deleted:
                stmt = stmt.where(LotteryGame.deleted_at.is_(None))
            return self._session.execute(stmt).scalar_one_or_none()
        except SQLAlchemyError as exc:
            logger.error(
                "Database error in get_by_code for LotteryGame: %s",
                exc.__class__.__name__,
            )
            raise RepositoryError("Failed to fetch LotteryGame by code") from exc
