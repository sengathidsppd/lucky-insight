"""User-specific repository.

Extends ``BaseRepository`` with query and mutation methods particular to
the ``User`` entity: lookup by email, login tracking, and activation
state. Contains data access only — no business logic, no JWT, no
authentication.
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.models.user import User
from app.repositories.base_repository import BaseRepository
from app.repositories.exceptions import (
    DuplicateEntityError,
    EntityNotFoundError,
    RepositoryError,
)

logger = get_logger(__name__)


class UserRepository(BaseRepository[User]):
    """Data-access layer for the ``users`` table."""

    def __init__(self, session: Session) -> None:
        """Initialize the repository.

        Args:
            session: An active SQLAlchemy session.
        """
        super().__init__(session, User)

    def get_by_email(self, email: str, *, include_deleted: bool = False) -> User | None:
        """Fetch a user by email address.

        Args:
            email: The email address to search for (matched exactly, as
                stored).
            include_deleted: If True, soft-deleted users are also
                considered.

        Returns:
            The matching user, or None if no user has that email.

        Raises:
            RepositoryError: If the underlying query fails.
        """
        try:
            stmt = select(User).where(User.email == email)
            if not include_deleted:
                stmt = stmt.where(User.deleted_at.is_(None))
            return self._session.execute(stmt).scalar_one_or_none()
        except SQLAlchemyError as exc:
            logger.error("Database error in get_by_email: %s", exc.__class__.__name__)
            raise RepositoryError("Failed to fetch user by email") from exc

    def email_exists(self, email: str, *, include_deleted: bool = False) -> bool:
        """Check whether a user with the given email already exists.

        Args:
            email: The email address to check.
            include_deleted: If True, soft-deleted users also count.

        Returns:
            True if a user with that email exists, False otherwise.

        Raises:
            RepositoryError: If the underlying query fails.
        """
        return self.get_by_email(email, include_deleted=include_deleted) is not None

    def create_user(self, user: User) -> User:
        """Persist a new user.

        Args:
            user: An unsaved ``User`` instance.

        Returns:
            The persisted user, with generated fields (id, created_at,
            etc.) populated.

        Raises:
            DuplicateEntityError: If a user with the same email already
                exists.
            RepositoryError: If the insert fails for any other reason.
        """
        try:
            created = self.create(user)
        except DuplicateEntityError as exc:
            logger.warning("Attempted to create user with a duplicate email")
            raise DuplicateEntityError(f"A user with email {user.email!r} already exists") from exc
        logger.info("Created user id=%s", created.id)
        return created

    def update_last_login(self, user_id: uuid.UUID) -> User:
        """Set ``last_login_at`` to the current UTC time for a user.

        Args:
            user_id: The ID of the user who just logged in.

        Returns:
            The updated user.

        Raises:
            EntityNotFoundError: If no active user with that ID exists.
            RepositoryError: If the update fails for any other reason.
        """
        user = self.get_by_id(user_id)
        if user is None:
            raise EntityNotFoundError(f"User {user_id} not found")

        user.last_login_at = datetime.now(UTC)
        updated = self.update(user)
        logger.info("Updated last_login_at for user id=%s", user_id)
        return updated

    def activate(self, user_id: uuid.UUID) -> User:
        """Mark a user as active.

        Args:
            user_id: The ID of the user to activate.

        Returns:
            The updated user.

        Raises:
            EntityNotFoundError: If no active user with that ID exists.
            RepositoryError: If the update fails for any other reason.
        """
        user = self._set_active(user_id, is_active=True)
        logger.info("Activated user id=%s", user_id)
        return user

    def deactivate(self, user_id: uuid.UUID) -> User:
        """Mark a user as inactive.

        Args:
            user_id: The ID of the user to deactivate.

        Returns:
            The updated user.

        Raises:
            EntityNotFoundError: If no active user with that ID exists.
            RepositoryError: If the update fails for any other reason.
        """
        user = self._set_active(user_id, is_active=False)
        logger.info("Deactivated user id=%s", user_id)
        return user

    def _set_active(self, user_id: uuid.UUID, *, is_active: bool) -> User:
        """Fetch a user by ID and update its ``is_active`` flag.

        Args:
            user_id: The ID of the user to update.
            is_active: The new value for ``is_active``.

        Returns:
            The updated user.

        Raises:
            EntityNotFoundError: If no active user with that ID exists.
            RepositoryError: If the update fails for any other reason.
        """
        user = self.get_by_id(user_id)
        if user is None:
            raise EntityNotFoundError(f"User {user_id} not found")

        user.is_active = is_active
        return self.update(user)
