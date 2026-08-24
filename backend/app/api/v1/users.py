"""User API endpoints (v1)."""

import uuid
from fastapi import APIRouter, Depends, status, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.dependencies.auth import get_current_active_user, get_current_admin_user, get_user_service
from app.api.v1.auth import get_auth_service
from app.models.user import User
from app.services.user_service import UserService
from app.services.auth_service import AuthService
from app.repositories.exceptions import DuplicateEntityError
from app.services.exceptions import InvalidEmailFormatException
from app.schemas.auth import RegisterRequest, RegisterResponse, UserPublic
from app.schemas.user import (
    CurrentUserResponse, 
    UserResponse, 
    UserListResponse, 
    AdminStatusUpdate, 
    UserAdminUpdateResponse,
    AdminUserPasswordReset,
    UserPasswordResetResponse
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

@router.post(
    "",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user (Admin only)",
)
def create_user(
    payload: RegisterRequest,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service),
) -> RegisterResponse:
    try:
        user = auth_service.register_user(payload.email, payload.password)
    except DuplicateEntityError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except InvalidEmailFormatException as exc:
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
    user_service: UserService = Depends(get_user_service),
    db: Session = Depends(get_db)
) -> UserAdminUpdateResponse:
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own admin status"
        )
    
    u = user_service.update_admin_status(user_id, update_data.is_admin)
    db.commit()
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

@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a user (Admin only)",
)
def delete_user(
    user_id: uuid.UUID,
    current_admin: User = Depends(get_current_admin_user),
    user_service: UserService = Depends(get_user_service),
    db: Session = Depends(get_db)
):
    success = user_service.delete_user(user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found or already deleted",
        )
    db.commit()

@router.patch(
    "/{user_id}/password",
    response_model=UserPasswordResetResponse,
    status_code=status.HTTP_200_OK,
    summary="Reset a user's password (Admin only)",
)
def admin_reset_password(
    user_id: uuid.UUID,
    reset_data: AdminUserPasswordReset,
    current_admin: User = Depends(get_current_admin_user),
    user_service: UserService = Depends(get_user_service),
    db: Session = Depends(get_db)
) -> UserPasswordResetResponse:
    u = user_service.reset_password(user_id, reset_data.new_password)
    db.commit()
    return UserPasswordResetResponse(
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


@router.post(
    "/{user_id}/reset-analysis-quota",
    status_code=status.HTTP_200_OK,
    summary="Reset a user's daily analysis quota (Admin only)",
)
def reset_user_analysis_quota(
    user_id: uuid.UUID,
    game_id: str | None = Query(None),
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    from datetime import datetime, timezone, timedelta
    from app.models.analysis_job import AnalysisJob
    from sqlalchemy.orm.attributes import flag_modified

    tz_local = timezone(timedelta(hours=7))
    start_of_today = datetime.now(tz_local).replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc).replace(tzinfo=None)

    jobs = (
        db.query(AnalysisJob)
        .filter(
            AnalysisJob.user_id == user_id,
            AnalysisJob.created_at >= start_of_today,
        )
        .all()
    )
    for job in jobs:
        params = dict(job.parameters or {})
        if not game_id or str(params.get("game_id")) == str(game_id):
            params["quota_reset"] = True
            job.parameters = params
            flag_modified(job, "parameters")

    db.commit()

    return {"success": True, "message": "Successfully reset daily analysis quota without deleting history."}
