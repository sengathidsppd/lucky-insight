"""Repository for user-defined number tags."""

import uuid
from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.models.number_tag import NumberTag
from app.repositories.base_repository import BaseRepository
from app.repositories.exceptions import DuplicateEntityError, RepositoryError

logger = get_logger(__name__)


class NumberTagRepository(BaseRepository[NumberTag]):
    """Data access layer for user-defined tags.

    Tags are scoped per user — the same tag name may exist for
    different users but must be unique within a single user's set.
    """

    def __init__(self, session: Session) -> None:
        """Initialize with a database session.

        Args:
            session: An active SQLAlchemy session.
        """
        super().__init__(session, NumberTag)

    def get_by_user(self, user_id: uuid.UUID) -> Sequence[NumberTag]:
        """Return all active tags belonging to a specific user.

        Args:
            user_id: The owning user's UUID.

        Returns:
            Tags ordered alphabetically by name.

        Raises:
            RepositoryError: If the underlying query fails.
        """
        try:
            stmt = (
                select(NumberTag)
                .where(NumberTag.user_id == user_id)
                .where(NumberTag.deleted_at.is_(None))
                .order_by(NumberTag.name)
            )
            return self._session.execute(stmt).scalars().all()
        except SQLAlchemyError as exc:
            logger.error(
                "Database error fetching tags for user: %s",
                exc.__class__.__name__,
            )
            raise RepositoryError("Failed to fetch user tags") from exc

    def get_by_user_and_name(
        self,
        user_id: uuid.UUID,
        name: str,
    ) -> NumberTag | None:
        """Find a single tag by user and exact name match.

        Args:
            user_id: The owning user's UUID.
            name: The exact tag name to look for.

        Returns:
            The matching tag, or None.

        Raises:
            RepositoryError: If the underlying query fails.
        """
        try:
            stmt = (
                select(NumberTag)
                .where(NumberTag.user_id == user_id)
                .where(NumberTag.name == name)
                .where(NumberTag.deleted_at.is_(None))
            )
            return self._session.execute(stmt).scalar_one_or_none()
        except SQLAlchemyError as exc:
            logger.error(
                "Database error finding tag by name: %s",
                exc.__class__.__name__,
            )
            raise RepositoryError("Failed to find tag") from exc

    def get_by_ids(
        self,
        tag_ids: list[uuid.UUID],
    ) -> Sequence[NumberTag]:
        """Return all active tags matching the given IDs.

        Args:
            tag_ids: A list of tag UUIDs to look up.

        Returns:
            All matching, non-deleted tags.

        Raises:
            RepositoryError: If the underlying query fails.
        """
        if not tag_ids:
            return []
        try:
            stmt = (
                select(NumberTag)
                .where(NumberTag.id.in_(tag_ids))
                .where(NumberTag.deleted_at.is_(None))
            )
            return self._session.execute(stmt).scalars().all()
        except SQLAlchemyError as exc:
            logger.error(
                "Database error fetching tags by ids: %s",
                exc.__class__.__name__,
            )
            raise RepositoryError("Failed to fetch tags by ids") from exc

    def create_tag(self, tag: NumberTag) -> NumberTag:
        """Persist a new tag with a user-friendly duplicate error message.

        Args:
            tag: The NumberTag entity to persist.

        Returns:
            The persisted tag with generated fields populated.

        Raises:
            DuplicateEntityError: If a tag with the same name already
                exists for the user.
        """
        try:
            return self.create(tag)
        except DuplicateEntityError as exc:
            raise DuplicateEntityError(
                f"Tag '{tag.name}' already exists for this user",
            ) from exc
