"""Generic, reusable repository providing common data-access operations.

Implements the Repository Pattern per docs/ARCHITECTURE.md: all direct
database access is isolated behind this class, and callers never see raw
SQLAlchemy exceptions or write queries themselves.

The project currently uses a synchronous SQLAlchemy session (see
``app.core.database``), so this repository is synchronous too.
"""

import uuid
from collections.abc import Sequence
from datetime import UTC, datetime
from typing import Generic, TypeVar

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.models.base import BaseEntity
from app.repositories.exceptions import DuplicateEntityError, RepositoryError

ModelType = TypeVar("ModelType", bound=BaseEntity)

logger = get_logger(__name__)


class BaseRepository(Generic[ModelType]):
    """A generic data-access layer for a single ORM model.

    Repository methods flush the session (so generated fields such as
    ``id`` and ``created_at`` are populated and constraint violations
    surface immediately) but never commit. Committing the transaction is
    the caller's responsibility, matching the existing convention in
    ``app.core.database.get_db``.
    """

    def __init__(self, session: Session, model: type[ModelType]) -> None:
        """Initialize the repository.

        Args:
            session: An active SQLAlchemy session.
            model: The ORM model class this repository manages.
        """
        self._session = session
        self._model = model

    def get_by_id(self, entity_id: uuid.UUID, *, include_deleted: bool = False) -> ModelType | None:
        """Fetch a single entity by its primary key.

        Args:
            entity_id: The UUID primary key to look up.
            include_deleted: If True, soft-deleted rows are also considered.

        Returns:
            The matching entity, or None if no such entity exists.

        Raises:
            RepositoryError: If the underlying query fails.
        """
        try:
            stmt = select(self._model).where(self._model.id == entity_id)
            if not include_deleted:
                stmt = stmt.where(self._model.deleted_at.is_(None))
            return self._session.execute(stmt).scalar_one_or_none()
        except SQLAlchemyError as exc:
            logger.error(
                "Database error in get_by_id for %s: %s",
                self._model.__name__,
                exc.__class__.__name__,
            )
            raise RepositoryError(f"Failed to fetch {self._model.__name__} by id") from exc

    def get_all(
        self,
        *,
        include_deleted: bool = False,
        limit: int | None = None,
        offset: int | None = None,
    ) -> Sequence[ModelType]:
        """Fetch multiple entities, optionally paginated.

        Args:
            include_deleted: If True, soft-deleted rows are also included.
            limit: Maximum number of rows to return.
            offset: Number of rows to skip before collecting results.

        Returns:
            A sequence of matching entities.

        Raises:
            RepositoryError: If the underlying query fails.
        """
        try:
            stmt = select(self._model)
            if not include_deleted:
                stmt = stmt.where(self._model.deleted_at.is_(None))
            if offset is not None:
                stmt = stmt.offset(offset)
            if limit is not None:
                stmt = stmt.limit(limit)
            return self._session.execute(stmt).scalars().all()
        except SQLAlchemyError as exc:
            logger.error(
                "Database error in get_all for %s: %s",
                self._model.__name__,
                exc.__class__.__name__,
            )
            raise RepositoryError(f"Failed to fetch {self._model.__name__} list") from exc

    def create(self, entity: ModelType) -> ModelType:
        """Persist a new entity.

        Args:
            entity: An unsaved model instance.

        Returns:
            The persisted entity, with generated fields (id, created_at,
            etc.) populated.

        Raises:
            DuplicateEntityError: If the insert violates a uniqueness
                constraint.
            RepositoryError: If the insert fails for any other reason.
        """
        try:
            # A SAVEPOINT (nested transaction) scopes the rollback to just
            # this operation on failure, instead of discarding any other
            # unrelated, uncommitted work already held by the session.
            with self._session.begin_nested():
                self._session.add(entity)
                self._session.flush()
        except IntegrityError as exc:
            logger.warning(
                "Duplicate %s on create: %s", self._model.__name__, exc.__class__.__name__
            )
            raise DuplicateEntityError(f"{self._model.__name__} already exists") from exc
        except SQLAlchemyError as exc:
            logger.error(
                "Database error creating %s: %s", self._model.__name__, exc.__class__.__name__
            )
            raise RepositoryError(f"Failed to create {self._model.__name__}") from exc
        self._session.refresh(entity)
        return entity

    def update(self, entity: ModelType) -> ModelType:
        """Persist changes made to an already-tracked entity.

        Args:
            entity: A model instance, previously loaded from this
                session, with attributes already modified by the caller.

        Returns:
            The updated entity.

        Raises:
            RepositoryError: If the update fails.
        """
        try:
            with self._session.begin_nested():
                self._session.flush()
        except SQLAlchemyError as exc:
            logger.error(
                "Database error updating %s: %s", self._model.__name__, exc.__class__.__name__
            )
            raise RepositoryError(f"Failed to update {self._model.__name__}") from exc
        self._session.refresh(entity)
        return entity

    def soft_delete(self, entity_id: uuid.UUID) -> bool:
        """Mark an entity as deleted without removing it from the database.

        Args:
            entity_id: The UUID primary key of the entity to soft-delete.

        Returns:
            True if an active entity was found and soft-deleted, False if
            no such (non-deleted) entity exists.

        Raises:
            RepositoryError: If the update fails.
        """
        entity = self.get_by_id(entity_id)
        if entity is None:
            return False

        try:
            with self._session.begin_nested():
                entity.deleted_at = datetime.now(UTC)
                self._session.flush()
        except SQLAlchemyError as exc:
            logger.error(
                "Database error soft-deleting %s id=%s: %s",
                self._model.__name__,
                entity_id,
                exc.__class__.__name__,
            )
            raise RepositoryError(f"Failed to soft-delete {self._model.__name__}") from exc
        logger.info("Soft-deleted %s id=%s", self._model.__name__, entity_id)
        return True

    def exists(self, entity_id: uuid.UUID, *, include_deleted: bool = False) -> bool:
        """Check whether an entity with the given ID exists.

        Args:
            entity_id: The UUID primary key to check.
            include_deleted: If True, soft-deleted rows also count.

        Returns:
            True if a matching entity exists, False otherwise.

        Raises:
            RepositoryError: If the underlying query fails.
        """
        try:
            stmt = select(self._model.id).where(self._model.id == entity_id)
            if not include_deleted:
                stmt = stmt.where(self._model.deleted_at.is_(None))
            return self._session.execute(stmt).first() is not None
        except SQLAlchemyError as exc:
            logger.error(
                "Database error in exists for %s: %s", self._model.__name__, exc.__class__.__name__
            )
            raise RepositoryError(f"Failed to check {self._model.__name__} existence") from exc

    def count(self, *, include_deleted: bool = False) -> int:
        """Count entities, optionally including soft-deleted ones.

        Args:
            include_deleted: If True, soft-deleted rows are also counted.

        Returns:
            The number of matching entities.

        Raises:
            RepositoryError: If the underlying query fails.
        """
        try:
            stmt = select(func.count()).select_from(self._model)
            if not include_deleted:
                stmt = stmt.where(self._model.deleted_at.is_(None))
            result = self._session.execute(stmt).scalar_one()
            return int(result)
        except SQLAlchemyError as exc:
            logger.error(
                "Database error in count for %s: %s", self._model.__name__, exc.__class__.__name__
            )
            raise RepositoryError(f"Failed to count {self._model.__name__}") from exc
