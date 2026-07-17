"""User API endpoints (v1)."""

import uuid
from fastapi import APIRouter, Depends, status, HTTPException

from app.api.dependencies.auth import get_current_active_user, get_current_admin_user, get_user_service
from app.models.user import User
from app.services.user_service import UserService
from app.schemas.user import (
    CurrentUserResponse, 
    UserResponse, 
    UserListResponse, 
    AdminStatusUpdate, 
    UserAdminUpdateResponse
)

router = APIRouter(prefix="/users", tags=["Users"])


@router.get(
    "/me",
    response_model=CurrentUserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get the current authenticated user",
)
def get_me(current_user: User = Depends(get_current_active_user)) -> CurrentUserResponse:
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

@router.get(
    "",
    response_model=UserListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get all users (Admin only)",
)
def get_all_users(
    current_admin: User = Depends(get_current_admin_user),
    user_service: UserService = Depends(get_user_service)
) -> UserListResponse:
    users = user_service.get_all_users()
    return UserListResponse(
        data=[
            UserResponse(
                id=u.id,
                email=u.email,
                first_name=None,
                last_name=None,
                is_active=u.is_active,
                is_admin=u.is_admin,
                created_at=u.created_at,
                updated_at=u.updated_at,
            ) for u in users
        ]
    )

@router.patch(
    "/{user_id}/admin",
    response_model=UserAdminUpdateResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a user's admin status (Admin only)",
)
def update_admin_status(
    user_id: uuid.UUID,
    update_data: AdminStatusUpdate,
    current_admin: User = Depends(get_current_admin_user),
    user_service: UserService = Depends(get_user_service)
) -> UserAdminUpdateResponse:
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own admin status"
        )
    
    u = user_service.update_admin_status(user_id, update_data.is_admin)
    return UserAdminUpdateResponse(
        data=UserResponse(
            id=u.id,
            email=u.email,
            first_name=None,
            last_name=None,
            is_active=u.is_active,
            is_admin=u.is_admin,
            created_at=u.created_at,
            updated_at=u.updated_at,
        )
    )
