"""Authentication business logic.

Orchestrates registration, login, token issuance/refresh, and password
changes. Contains business logic only — no FastAPI, no HTTP status
codes, no JSON responses. Callers (a future API layer) are responsible
for translating the domain exceptions raised here into HTTP responses.
"""

import uuid

from email_validator import EmailNotValidError, validate_email

from app.core.config import get_settings
from app.core.logging import get_logger
from app.models.user import User
from app.repositories.exceptions import DuplicateEntityError, EntityNotFoundError
from app.repositories.user_repository import UserRepository
from app.security.exceptions import InvalidCredentialsException, InvalidTokenException
from app.security.jwt import create_access_token, create_refresh_token, decode_refresh_token
from app.security.password import hash_password, verify_password
from app.security.tokens import TokenResponse
from app.services.exceptions import InactiveUserException, InvalidEmailFormatException

logger = get_logger(__name__)


class AuthService:
    """Business logic for user registration, authentication, and tokens."""

    def __init__(self, user_repository: UserRepository) -> None:
        """Initialize the service.

        Args:
            user_repository: The repository used for user persistence.
        """
        self._user_repository = user_repository

    def register_user(self, email: str, password: str) -> User:
        """Register a new user.

        Args:
            email: The new user's email address.
            password: The new user's plaintext password.

        Returns:
            The newly created, persisted user.

        Raises:
            InvalidEmailFormatException: If the email is not a valid
                format.
            DuplicateEntityError: If a user with that email already
                exists.
        """
        try:
            validate_email(email, check_deliverability=False)
        except EmailNotValidError as exc:
            logger.warning("Registration rejected: invalid email format")
            raise InvalidEmailFormatException(str(exc)) from exc

        if self._user_repository.email_exists(email):
            logger.warning("Registration rejected: duplicate email")
            raise DuplicateEntityError(f"A user with email {email!r} already exists")

        password_hash = hash_password(password)
        user = User(email=email, password_hash=password_hash)
        created = self._user_repository.create_user(user)
        logger.info("User registered id=%s", created.id)
        return created

    def authenticate_user(self, email: str, password: str) -> User:
        """Verify credentials and return the authenticated user.

        Args:
            email: The email address to authenticate.
            password: The plaintext password to verify.

        Returns:
            The authenticated, active user.

        Raises:
            InvalidCredentialsException: If the email is unknown or the
                password does not match. The same exception is used for
                both cases so callers cannot use error type to enumerate
                which emails are registered.
            InactiveUserException: If the credentials are correct but the
                account has been deactivated.
        """
        user = self._user_repository.get_by_email(email)
        if user is None or not verify_password(password, user.password_hash):
            logger.warning("Authentication failed")
            raise InvalidCredentialsException()

        if not user.is_active:
            logger.warning("Authentication rejected for inactive user id=%s", user.id)
            raise InactiveUserException()

        logger.info("Authentication succeeded for user id=%s", user.id)
        return user

    def generate_tokens(self, user: User) -> TokenResponse:
        """Issue a new access/refresh token pair for a user.

        Args:
            user: The user to issue tokens for.

        Returns:
            The issued access and refresh tokens.
        """
        settings = get_settings()
        subject = str(user.id)
        access_token = create_access_token(subject)
        refresh_token = create_refresh_token(subject)

        return TokenResponse(
            access_token=access_token.token,
            refresh_token=refresh_token.token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    def refresh_tokens(self, refresh_token: str) -> TokenResponse:
        """Verify a refresh token and issue a new token pair.

        Args:
            refresh_token: A previously issued, still-valid refresh token.

        Returns:
            A newly issued access and refresh token pair.

        Raises:
            InvalidTokenException: If the token is malformed, has an
                invalid signature, or its subject no longer maps to a
                user.
            ExpiredTokenException: If the token has expired.
            InactiveUserException: If the user account has been
                deactivated since the token was issued.
        """
        payload = decode_refresh_token(refresh_token)

        try:
            user_id = uuid.UUID(payload.sub)
        except ValueError as exc:
            raise InvalidTokenException("Refresh token subject is not a valid user id") from exc

        user = self._user_repository.get_by_id(user_id)
        if user is None:
            raise InvalidTokenException("Refresh token no longer maps to an existing user")

        if not user.is_active:
            logger.warning("Token refresh rejected for inactive user id=%s", user.id)
            raise InactiveUserException()

        logger.info("Issued refreshed tokens for user id=%s", user.id)
        return self.generate_tokens(user)

    def change_password(self, user_id: uuid.UUID, current_password: str, new_password: str) -> User:
        """Change a user's password after verifying the current one.

        Args:
            user_id: The ID of the user changing their password.
            current_password: The user's current plaintext password.
            new_password: The new plaintext password.

        Returns:
            The updated user.

        Raises:
            EntityNotFoundError: If no active user with that ID exists.
            InvalidCredentialsException: If ``current_password`` does not
                match the stored hash.
        """
        user = self._user_repository.get_by_id(user_id)
        if user is None:
            raise EntityNotFoundError(f"User {user_id} not found")

        if not verify_password(current_password, user.password_hash):
            logger.warning("Password change rejected for user id=%s", user_id)
            raise InvalidCredentialsException("Current password is incorrect")

        user.password_hash = hash_password(new_password)
        updated = self._user_repository.update(user)
        logger.info("Password changed for user id=%s", user_id)
        return updated
