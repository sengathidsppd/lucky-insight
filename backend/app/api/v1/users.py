"""User API endpoints (v1).

Thin presentation layer only: authentication is handled entirely by the
reused ``get_current_active_user`` dependency (which itself relies on
``get_current_user`` from TASK-010 — no JWT is decoded here). This
router performs no database access, no repository usage, and no
business logic of its own.
"""

from fastapi import APIRouter, Depends, status

from app.api.dependencies.auth import get_current_active_user
from app.models.user import User
from app.schemas.user import CurrentUserResponse, UserResponse

router = APIRouter(prefix="/users", tags=["Users"])


@router.get(
    "/me",
    response_model=CurrentUserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get the current authenticated user",
)
def get_me(current_user: User = Depends(get_current_active_user)) -> CurrentUserResponse:
    """Return the currently authenticated, active user.

    Args:
        current_user: The authenticated, active user, injected by
            ``get_current_active_user``.

    Returns:
        The current user's public profile, wrapped in the standard
        success envelope.

    Raises:
        HTTPException: Raised by ``get_current_active_user`` itself —
            401 if the token is missing, invalid, or expired; 403 if the
            account has been deactivated.
    """
    return CurrentUserResponse(
        data=UserResponse(
            id=current_user.id,
            email=current_user.email,
            first_name=None,
            last_name=None,
            is_active=current_user.is_active,
            is_admin=current_user.is_admin,
            created_at=current_user.created_at,
            updated_at=current_user.updated_at,
        )
    )
