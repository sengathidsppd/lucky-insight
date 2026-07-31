"""Repository for number records.

Provides data access for the core ``NumberRecord`` entity, including
user-scoped queries, multi-criteria search, and favorite toggling.
"""

import uuid
from collections.abc import Sequence
from datetime import datetime

from sqlalchemy import Select, func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.core.logging import get_logger
from app.models.number_record import NumberRecord
from app.models.record_tag import record_tags
from app.repositories.base_repository import BaseRepository
from app.repositories.exceptions import EntityNotFoundError, RepositoryError

logger = get_logger(__name__)


class NumberRecordRepository(BaseRepository[NumberRecord]):
    """Data access layer for number records.

    All query methods scope results to a specific user and exclude
    soft-deleted rows by default.
    """

    def __init__(self, session: Session) -> None:
        """Initialize with a database session.

        Args:
            session: An active SQLAlchemy session.
        """
        super().__init__(session, NumberRecord)

    def _base_query(
        self,
        user_id: uuid.UUID,
    ) -> Select[tuple[NumberRecord]]:
        """Return a base select scoped to a user with eager-loaded relations.

        Args:
            user_id: The owning user's UUID.

        Returns:
            A SQLAlchemy Select statement.
        """
        return (
            select(NumberRecord)
            .where(NumberRecord.user_id == user_id)
            .where(NumberRecord.deleted_at.is_(None))
            .options(
                selectinload(NumberRecord.source),
                selectinload(NumberRecord.category),
                selectinload(NumberRecord.tags),
            )
        )

    def get_by_user(
        self,
        user_id: uuid.UUID,
        *,
        limit: int = 20,
        offset: int = 0,
    ) -> Sequence[NumberRecord]:
        """Return paginated records for a user, newest first.

        Args:
            user_id: The owning user's UUID.
            limit: Maximum number of rows to return.
            offset: Number of rows to skip.

        Returns:
            A sequence of NumberRecord entities.

        Raises:
            RepositoryError: If the underlying query fails.
        """
        try:
            stmt = (
                self._base_query(user_id)
                .order_by(NumberRecord.recorded_at.desc())
                .offset(offset)
                .limit(limit)
            )
            return self._session.execute(stmt).scalars().all()
        except SQLAlchemyError as exc:
            logger.error(
                "Database error fetching user records: %s",
                exc.__class__.__name__,
            )
            raise RepositoryError("Failed to fetch records") from exc

    def count_by_user(self, user_id: uuid.UUID) -> int:
        """Count active records for a user.

        Args:
            user_id: The owning user's UUID.

        Returns:
            The number of active records.

        Raises:
            RepositoryError: If the underlying query fails.
        """
        try:
            stmt = (
                select(func.count())
                .select_from(NumberRecord)
                .where(NumberRecord.user_id == user_id)
                .where(NumberRecord.deleted_at.is_(None))
            )
            result = self._session.execute(stmt).scalar_one()
            return int(result)
        except SQLAlchemyError as exc:
            logger.error(
                "Database error counting user records: %s",
                exc.__class__.__name__,
            )
            raise RepositoryError("Failed to count records") from exc

    def get_by_user_and_id(
        self,
        user_id: uuid.UUID,
        record_id: uuid.UUID,
    ) -> NumberRecord | None:
        """Fetch a single record owned by the given user.

        Args:
            user_id: The owning user's UUID.
            record_id: The record's UUID.

        Returns:
            The matching record, or None.

        Raises:
            RepositoryError: If the underlying query fails.
        """
        try:
            stmt = self._base_query(user_id).where(
                NumberRecord.id == record_id,
            )
            return self._session.execute(stmt).scalar_one_or_none()
        except SQLAlchemyError as exc:
            logger.error(
                "Database error fetching record: %s",
                exc.__class__.__name__,
            )
            raise RepositoryError("Failed to fetch record") from exc

    def search(
        self,
        user_id: uuid.UUID,
        *,
        number: str | None = None,
        source_id: uuid.UUID | None = None,
        category_id: uuid.UUID | None = None,
        tag_ids: list[uuid.UUID] | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        keyword: str | None = None,
        is_favorite: bool | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[Sequence[NumberRecord], int]:
        """Search records with multiple optional filters.

        Args:
            user_id: The owning user's UUID.
            number: Partial match on the number field.
            source_id: Exact match on source.
            category_id: Exact match on category.
            tag_ids: Records must have at least one of these tags.
            date_from: Earliest recorded_at (inclusive).
            date_to: Latest recorded_at (inclusive).
            keyword: Partial match on the note field.
            is_favorite: Filter by favorite status.
            limit: Maximum number of rows to return.
            offset: Number of rows to skip.

        Returns:
            A tuple of (matching_records, total_count).

        Raises:
            RepositoryError: If the underlying query fails.
        """
        try:
            # Build filter conditions
            conditions = [
                NumberRecord.user_id == user_id,
                NumberRecord.deleted_at.is_(None),
            ]
            if number is not None:
                conditions.append(
                    NumberRecord.number.ilike(f"%{number}%"),
                )
            if source_id is not None:
                conditions.append(NumberRecord.source_id == source_id)
            if category_id is not None:
                conditions.append(
                    NumberRecord.category_id == category_id,
                )
            if date_from is not None:
                conditions.append(
                    NumberRecord.recorded_at >= date_from,
                )
            if date_to is not None:
                conditions.append(NumberRecord.recorded_at <= date_to)
            if keyword is not None:
                conditions.append(
                    NumberRecord.note.ilike(f"%{keyword}%"),
                )
            if is_favorite is not None:
                conditions.append(
                    NumberRecord.is_favorite == is_favorite,
                )
            if tag_ids:
                conditions.append(
                    NumberRecord.id.in_(
                        select(record_tags.c.record_id).where(
                            record_tags.c.tag_id.in_(tag_ids),
                        ),
                    ),
                )

            # Total count
            count_stmt = select(func.count()).select_from(NumberRecord).where(*conditions)
            total = int(
                self._session.execute(count_stmt).scalar_one(),
            )

            # Paginated results with eager loading
            results_stmt = (
                select(NumberRecord)
                .where(*conditions)
                .options(
                    selectinload(NumberRecord.source),
                    selectinload(NumberRecord.category),
                    selectinload(NumberRecord.tags),
                )
                .order_by(NumberRecord.recorded_at.desc())
                .offset(offset)
                .limit(limit)
            )
            records = self._session.execute(results_stmt).scalars().all()

            return records, total
        except SQLAlchemyError as exc:
            logger.error(
                "Database error searching records: %s",
                exc.__class__.__name__,
            )
            raise RepositoryError("Failed to search records") from exc

    def set_favorite(
        self,
        record_id: uuid.UUID,
        user_id: uuid.UUID,
        *,
        is_favorite: bool,
    ) -> NumberRecord:
        """Update the favorite status of a record.

        Args:
            record_id: The record's UUID.
            user_id: The owning user's UUID.
            is_favorite: The new favorite status.

        Returns:
            The updated record.

        Raises:
            EntityNotFoundError: If the record does not exist or
                is not owned by the user.
            RepositoryError: If the update fails.
        """
        record = self.get_by_user_and_id(user_id, record_id)
        if record is None:
            raise EntityNotFoundError("Record not found")
        try:
            with self._session.begin_nested():
                record.is_favorite = is_favorite
                self._session.flush()
        except SQLAlchemyError as exc:
            logger.error(
                "Database error toggling favorite: %s",
                exc.__class__.__name__,
            )
            raise RepositoryError(
                "Failed to update favorite status",
            ) from exc
        self._session.refresh(record)
        return record
