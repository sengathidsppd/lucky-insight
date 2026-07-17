"""Reusable FastAPI authentication dependencies.

Thin presentation-layer glue: reads the Bearer token via
``OAuth2PasswordBearer``, delegates JWT validation to
``app.security.jwt``, and delegates user lookup to ``UserService``.
Domain exceptions raised by the security and service layers are
converted to HTTP responses only here — the layers underneath never
raise ``HTTPException`` themselves.
"""

import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.repositories.exceptions import EntityNotFoundError
from app.repositories.user_repository import UserRepository
from app.security.exceptions import ExpiredTokenException, InvalidTokenException
from app.security.jwt import decode_access_token
from app.services.user_service import UserService

# tokenUrl is used only to populate OpenAPI docs (e.g. the "Authorize"
# button); auto_error=False so a missing/malformed Authorization header
# yields None instead of FastAPI's own 401, letting each dependency below
# decide how to handle that case.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

_CREDENTIALS_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_user_service(db: Session = Depends(get_db)) -> UserService:
    """Provide a ``UserService`` backed by a request-scoped session.

    Args:
        db: The request-scoped database session, injected by FastAPI.

    Returns:
        A ``UserService`` instance wired to a ``UserRepository`` using
        the same session.
    """
    return UserService(UserRepository(db))


def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    user_service: UserService = Depends(get_user_service),
) -> User:
    """Resolve the authenticated user from a Bearer access token.

    Validates the token's signature and expiration (via
    ``decode_access_token``), then confirms the token's subject still
    maps to an existing user.

    Args:
        token: The Bearer token extracted from the Authorization header,
            or None if no such header was present.
        user_service: The injected user service.

    Returns:
        The authenticated user.

    Raises:
        HTTPException: With status 401 if the token is missing,
            malformed, has an invalid signature, has expired, or no
            longer maps to an existing user.
    """
    if token is None:
        raise _CREDENTIALS_ERROR

    try:
        payload = decode_access_token(token)
    except (ExpiredTokenException, InvalidTokenException) as exc:
        raise _CREDENTIALS_ERROR from exc

    try:
        user_id = uuid.UUID(payload.sub)
    except ValueError as exc:
        raise _CREDENTIALS_ERROR from exc

    try:
        return user_service.get_user_by_id(user_id)
    except EntityNotFoundError as exc:
        raise _CREDENTIALS_ERROR from exc


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Require that the current user's account is active.

    Args:
        current_user: The authenticated user, injected by
            ``get_current_user``.

    Returns:
        The authenticated, active user.

    Raises:
        HTTPException: With status 403 if the account has been
            deactivated.
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )
    return current_user


def optional_current_user(
    token: str | None = Depends(oauth2_scheme),
    user_service: UserService = Depends(get_user_service),
) -> User | None:
    """Resolve the current user if a valid token is present, else None.

    Unlike ``get_current_user``, this never raises for a missing or
    invalid token — it simply returns None. Intended for endpoints that
    behave differently for authenticated vs. anonymous callers without
    requiring authentication.

    Args:
        token: The Bearer token extracted from the Authorization header,
            or None if no such header was present.
        user_service: The injected user service.

    Returns:
        The authenticated user, or None if no valid token was supplied.
    """
    if token is None:
        return None

    try:
        payload = decode_access_token(token)
        user_id = uuid.UUID(payload.sub)
        return user_service.get_user_by_id(user_id)
    except (ExpiredTokenException, InvalidTokenException, ValueError, EntityNotFoundError):
        return None

def get_current_admin_user(current_user: User = Depends(get_current_active_user)) -> User:
    """Require that the current active user is an admin.

    Args:
        current_user: The authenticated active user.

    Returns:
        The authenticated admin user.

    Raises:
        HTTPException: With status 403 if the user is not an admin.
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user
