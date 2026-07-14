"""Authentication API endpoints (v1).

Thin presentation layer: validates the request (via Pydantic), delegates
all business logic to ``AuthService``, and translates domain exceptions
into HTTP responses. Never accesses ``UserRepository`` directly.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.logging import get_logger
from app.repositories.exceptions import DuplicateEntityError
from app.repositories.user_repository import UserRepository
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RefreshRequest,
    RefreshResponse,
    RegisterRequest,
    RegisterResponse,
    TokenData,
    UserPublic,
)
from app.security.exceptions import (
    ExpiredTokenException,
    InvalidCredentialsException,
    InvalidTokenException,
)
from app.services.auth_service import AuthService
from app.services.exceptions import InactiveUserException, InvalidEmailFormatException

logger = get_logger(__name__)

router = APIRouter(prefix="/auth", tags=["Auth"])


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    """Provide an ``AuthService`` backed by a request-scoped session.

    Args:
        db: The request-scoped database session, injected by FastAPI.

    Returns:
        An ``AuthService`` instance wired to a ``UserRepository`` using
        the same session.
    """
    return AuthService(UserRepository(db))


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
def register(
    payload: RegisterRequest,
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service),
) -> RegisterResponse:
    """Register a new user account.

    Args:
        payload: The validated registration request body.
        db: The request-scoped database session. Used only to commit the
            transaction after the service layer has done its work — all
            data access itself goes through ``AuthService``.
        auth_service: The injected authentication service.

    Returns:
        The newly created user, wrapped in the standard success envelope.

    Raises:
        HTTPException: With status 409 if a user with that email already
            exists, or 400 if the email fails service-level format
            validation.
    """
    try:
        user = auth_service.register_user(payload.email, payload.password)
    except DuplicateEntityError as exc:
        logger.info("Registration rejected: email already exists")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except InvalidEmailFormatException as exc:
        logger.info("Registration rejected: invalid email format")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    db.commit()

    return RegisterResponse(
        data=UserPublic(
            id=user.id,
            email=user.email,
            first_name=payload.first_name,
            last_name=payload.last_name,
            is_active=user.is_active,
            is_admin=user.is_admin,
        )
    )


@router.post(
    "/login",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate a user and issue tokens",
)
def login(
    payload: LoginRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> LoginResponse:
    """Authenticate a user and issue an access/refresh token pair.

    Args:
        payload: The validated login request body.
        auth_service: The injected authentication service.

    Returns:
        The issued tokens, wrapped in the standard success envelope.

    Raises:
        HTTPException: With status 401 if the credentials are invalid, or
            403 if the account has been deactivated.
    """
    try:
        user = auth_service.authenticate_user(payload.email, payload.password)
    except InvalidCredentialsException as exc:
        logger.info("Login rejected: invalid credentials")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    except InactiveUserException as exc:
        logger.info("Login rejected: inactive user")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc

    tokens = auth_service.generate_tokens(user)

    return LoginResponse(
        data=TokenData(
            access_token=tokens.access_token,
            refresh_token=tokens.refresh_token,
            token_type="Bearer",
        )
    )


@router.post(
    "/refresh",
    response_model=RefreshResponse,
    status_code=status.HTTP_200_OK,
    summary="Refresh an access token",
)
def refresh(
    payload: RefreshRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> RefreshResponse:
    """Exchange a valid refresh token for a new access/refresh token pair.

    Args:
        payload: The validated token refresh request body.
        auth_service: The injected authentication service.

    Returns:
        The newly issued tokens, wrapped in the standard success envelope.

    Raises:
        HTTPException: With status 400 if the token is invalid/malformed,
            401 if the token is expired, or 403 if the user is inactive.
    """
    try:
        tokens = auth_service.refresh_tokens(payload.refresh_token)
    except ExpiredTokenException as exc:
        logger.info("Refresh rejected: expired token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Expired refresh token",
        ) from exc
    except InvalidTokenException as exc:
        logger.info("Refresh rejected: invalid token")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid refresh token",
        ) from exc
    except InactiveUserException as exc:
        logger.info("Refresh rejected: inactive user")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is inactive",
        ) from exc

    return RefreshResponse(
        data=TokenData(
            access_token=tokens.access_token,
            refresh_token=tokens.refresh_token,
            token_type="Bearer",
        )
    )


import secrets
from datetime import datetime, timedelta, UTC
from app.core.config import get_settings
from app.core.email import send_password_reset_email
from app.models.user import User
from app.models.password_reset_token import PasswordResetToken
from app.schemas.password_reset import ForgotPasswordRequest, ResetPasswordRequest
from app.security.password import hash_password

settings = get_settings()

@router.post(
    "/forgot-password",
    status_code=status.HTTP_200_OK,
    summary="Request a password reset link",
)
def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """Initiates password reset process, generating a secure token and sending email."""
    user = db.query(User).filter(User.email == payload.email).filter(User.deleted_at.is_(None)).first()
    
    reset_url = None
    if user:
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(UTC) + timedelta(minutes=30)
        
        reset_token = PasswordResetToken(
            user_id=user.id,
            token=token,
            expires_at=expires_at,
            is_used=False
        )
        db.add(reset_token)
        db.commit()
        
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        send_password_reset_email(user.email, reset_url)
        
    return {
        "success": True,
        "message": "If the email is registered, a password reset link has been sent.",
        "data": {
            "reset_url": reset_url if settings.APP_ENV == "development" else None
        }
    }


@router.post(
    "/reset-password",
    status_code=status.HTTP_200_OK,
    summary="Reset password using token",
)
def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """Verify reset token and update user's password."""
    reset_token = db.query(PasswordResetToken).filter(PasswordResetToken.token == payload.token).filter(PasswordResetToken.deleted_at.is_(None)).first()
    
    if not reset_token or reset_token.is_used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or already used password reset token."
        )
        
    now = datetime.now(UTC)
    if reset_token.expires_at < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset token has expired."
        )
        
    user = db.query(User).filter(User.id == reset_token.user_id).filter(User.deleted_at.is_(None)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )
        
    hashed_pwd = hash_password(payload.new_password)
    user.password_hash = hashed_pwd
    reset_token.is_used = True
    db.commit()
    
    return {
        "success": True,
        "message": "Password has been reset successfully."
    }
