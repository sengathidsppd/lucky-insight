"""User business logic.

Read and profile-management operations for users, independent of
authentication concerns (see ``auth_service.py`` for registration, login,
and tokens). Contains business logic only — no FastAPI, no HTTP status
codes, no JSON responses.
"""

import uuid

from app.core.logging import get_logger
from app.models.user import User
from app.repositories.exceptions import DuplicateEntityError, EntityNotFoundError
from app.repositories.user_repository import UserRepository

logger = get_logger(__name__)


class UserService:
    """Business logic for reading and managing user accounts."""

    def __init__(self, user_repository: UserRepository) -> None:
        """Initialize the service.

        Args:
            user_repository: The repository used for user persistence.
        """
        self._user_repository = user_repository

    def get_user_by_id(self, user_id: uuid.UUID) -> User:
        """Fetch a user by ID.

        Args:
            user_id: The user's UUID.

        Returns:
            The matching, active user.

        Raises:
            EntityNotFoundError: If no active user with that ID exists.
        """
        user = self._user_repository.get_by_id(user_id)
        if user is None:
            raise EntityNotFoundError(f"User {user_id} not found")
        return user

    def get_user_by_email(self, email: str) -> User:
        """Fetch a user by email address.

        Args:
            email: The user's email address.

        Returns:
            The matching, active user.

        Raises:
            EntityNotFoundError: If no active user with that email
                exists.
        """
        user = self._user_repository.get_by_email(email)
        if user is None:
            raise EntityNotFoundError(f"User with email {email!r} not found")
        return user

    def update_profile(self, user_id: uuid.UUID, *, email: str | None = None) -> User:
        """Update a user's profile fields.

        Only ``email`` lives on the ``User`` entity today — display name,
        avatar, theme, etc. belong to a separate ``profiles`` table (see
        docs/DATABASE.md) that does not exist yet, so this method is
        intentionally narrow in scope.

        Args:
            user_id: The ID of the user to update.
            email: A new email address, if changing it. Left unchanged
                if None or identical to the current value.

        Returns:
            The updated user.

        Raises:
            EntityNotFoundError: If no active user with that ID exists.
            DuplicateEntityError: If the new email is already taken by
                another user.
        """
        user = self.get_user_by_id(user_id)

        if email is not None and email != user.email:
            if self._user_repository.email_exists(email):
                raise DuplicateEntityError(f"A user with email {email!r} already exists")
            user.email = email

        updated = self._user_repository.update(user)
        logger.info("Updated profile for user id=%s", user_id)
        return updated

    def activate_user(self, user_id: uuid.UUID) -> User:
        """Activate a user account.

        Args:
            user_id: The ID of the user to activate.

        Returns:
            The updated user.

        Raises:
            EntityNotFoundError: If no active user with that ID exists.
        """
        user = self._user_repository.activate(user_id)
        logger.info("User activated id=%s", user_id)
        return user

    def deactivate_user(self, user_id: uuid.UUID) -> User:
        """Deactivate a user account.

        Args:
            user_id: The ID of the user to deactivate.

        Returns:
            The updated user.

        Raises:
            EntityNotFoundError: If no active user with that ID exists.
        """
        user = self._user_repository.deactivate(user_id)
        logger.info("User deactivated id=%s", user_id)
        return user

    def get_all_users(self, *, include_deleted: bool = False, limit: int | None = None, offset: int | None = None) -> list[User]:
        """Fetch all users.

        Returns:
            A list of all users.
        """
        return list(self._user_repository.get_all(
            include_deleted=include_deleted, limit=limit, offset=offset
        ))

    def update_admin_status(self, user_id: uuid.UUID, is_admin: bool) -> User:
        """Update a user's admin status.

        Args:
            user_id: The ID of the user to update.
            is_admin: True to grant admin, False to revoke.

        Returns:
            The updated user.
        """
        user = self.get_user_by_id(user_id)
        user.is_admin = is_admin
        updated = self._user_repository.update(user)
        logger.info("Updated admin status for user id=%s to %s", user_id, is_admin)
        return updated
