"""Repository for AnalysisJob and AnalysisResult entities."""

import uuid
from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, joinedload

from app.core.logging import get_logger
from app.models.analysis_job import AnalysisJob
from app.models.analysis_result import AnalysisResult
from app.repositories.base_repository import BaseRepository
from app.repositories.exceptions import RepositoryError

logger = get_logger(__name__)


class AnalysisRepository(BaseRepository[AnalysisJob]):
    """Data access layer for AnalysisJob and AnalysisResult."""

    def __init__(self, session: Session) -> None:
        """Initialize with database session.

        Args:
            session: Active SQLAlchemy session.
        """
        super().__init__(session, AnalysisJob)

    def get_job_with_result(self, job_id: uuid.UUID) -> AnalysisJob | None:
        """Fetch a single AnalysisJob and eagerly load its result.

        Args:
            job_id: The UUID of the job.

        Returns:
            The matching AnalysisJob with result populated, or None.

        Raises:
            RepositoryError: If the query fails.
        """
        try:
            stmt = (
                select(AnalysisJob)
                .where(AnalysisJob.id == job_id)
                .where(AnalysisJob.deleted_at.is_(None))
                .options(joinedload(AnalysisJob.result))
            )
            return self._session.execute(stmt).scalar_one_or_none()
        except SQLAlchemyError as exc:
            logger.error(
                "Database error in get_job_with_result: %s",
                exc.__class__.__name__,
            )
            raise RepositoryError("Failed to fetch AnalysisJob with result") from exc

    def get_by_user(
        self,
        user_id: uuid.UUID,
        *,
        limit: int = 20,
        offset: int = 0,
    ) -> Sequence[AnalysisJob]:
        """Fetch all analysis jobs for a specific user, newest first.

        Args:
            user_id: The UUID of the owner.
            limit: Maximum number of rows to return.
            offset: Number of rows to skip.

        Returns:
            A sequence of AnalysisJob entities.

        Raises:
            RepositoryError: If the query fails.
        """
        try:
            stmt = (
                select(AnalysisJob)
                .where(AnalysisJob.user_id == user_id)
                .where(AnalysisJob.deleted_at.is_(None))
                .options(joinedload(AnalysisJob.result))
                .order_by(AnalysisJob.created_at.desc())
                .offset(offset)
                .limit(limit)
            )
            return self._session.execute(stmt).scalars().all()
        except SQLAlchemyError as exc:
            logger.error(
                "Database error in get_by_user for AnalysisJob: %s",
                exc.__class__.__name__,
            )
            raise RepositoryError("Failed to fetch user analysis jobs") from exc

    def create_result(self, result: AnalysisResult) -> AnalysisResult:
        """Persist a new AnalysisResult entity.

        Args:
            result: The AnalysisResult to create.

        Returns:
            The created AnalysisResult.

        Raises:
            RepositoryError: If the insert fails.
        """
        try:
            self._session.add(result)
            self._session.flush()
            return result
        except SQLAlchemyError as exc:
            logger.error(
                "Database error creating AnalysisResult: %s",
                exc.__class__.__name__,
            )
            raise RepositoryError("Failed to create AnalysisResult") from exc
