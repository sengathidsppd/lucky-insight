"""Repository for lookup tables (sources and categories).

These are system-wide reference tables that are not user-specific.
The repository provides read-only access to their contents.
"""

import uuid
from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.models.number_category import NumberCategory
from app.models.number_source import NumberSource
from app.repositories.exceptions import RepositoryError

logger = get_logger(__name__)


class LookupRepository:
    """Read-only data access for system-wide lookup tables.

    Sources and categories are shared across all users and are
    typically seeded once during deployment.
    """

    def __init__(self, session: Session) -> None:
        """Initialize with a database session.

        Args:
            session: An active SQLAlchemy session.
        """
        self._session = session

    # --- Sources ---

    def get_all_sources(self) -> Sequence[NumberSource]:
        """Return all active number sources.

        Returns:
            A sequence of NumberSource entities.

        Raises:
            RepositoryError: If the underlying query fails.
        """
        try:
            stmt = select(NumberSource).where(
                NumberSource.deleted_at.is_(None),
            )
            return self._session.execute(stmt).scalars().all()
        except SQLAlchemyError as exc:
            logger.error(
                "Database error fetching sources: %s",
                exc.__class__.__name__,
            )
            raise RepositoryError("Failed to fetch sources") from exc

    def get_source_by_id(
        self,
        source_id: uuid.UUID,
    ) -> NumberSource | None:
        """Return a single source by its primary key, or None.

        Args:
            source_id: The UUID of the source to look up.

        Returns:
            The matching NumberSource, or None.

        Raises:
            RepositoryError: If the underlying query fails.
        """
        try:
            stmt = (
                select(NumberSource)
                .where(NumberSource.id == source_id)
                .where(NumberSource.deleted_at.is_(None))
            )
            return self._session.execute(stmt).scalar_one_or_none()
        except SQLAlchemyError as exc:
            logger.error(
                "Database error fetching source by id: %s",
                exc.__class__.__name__,
            )
            raise RepositoryError("Failed to fetch source") from exc

    # --- Categories ---

    def get_all_categories(self) -> Sequence[NumberCategory]:
        """Return all active number categories.

        Returns:
            A sequence of NumberCategory entities.

        Raises:
            RepositoryError: If the underlying query fails.
        """
        try:
            stmt = select(NumberCategory).where(
                NumberCategory.deleted_at.is_(None),
            )
            return self._session.execute(stmt).scalars().all()
        except SQLAlchemyError as exc:
            logger.error(
                "Database error fetching categories: %s",
                exc.__class__.__name__,
            )
            raise RepositoryError("Failed to fetch categories") from exc

    def get_category_by_id(
        self,
        category_id: uuid.UUID,
    ) -> NumberCategory | None:
        """Return a single category by its primary key, or None.

        Args:
            category_id: The UUID of the category to look up.

        Returns:
            The matching NumberCategory, or None.

        Raises:
            RepositoryError: If the underlying query fails.
        """
        try:
            stmt = (
                select(NumberCategory)
                .where(NumberCategory.id == category_id)
                .where(NumberCategory.deleted_at.is_(None))
            )
            return self._session.execute(stmt).scalar_one_or_none()
        except SQLAlchemyError as exc:
            logger.error(
                "Database error fetching category by id: %s",
                exc.__class__.__name__,
            )
            raise RepositoryError("Failed to fetch category") from exc
