"""Pydantic schemas for user-facing API responses.

These describe response shapes only. Sensitive or internal fields
(``password_hash``, refresh tokens, ``deleted_at``, etc.) are
intentionally never included.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel


class UserResponse(BaseModel):
    """Public-facing representation of a user.

    Note:
        ``first_name`` and ``last_name`` are not currently persisted —
        the ``users`` table stores only authentication credentials (see
        docs/DATABASE.md); profile fields like a person's name belong to
        a separate ``profiles`` table that does not exist yet (the
        registration endpoint in TASK-008 accepts but does not save
        them, for the same reason). They are included here as ``None``
        rather than fabricated placeholder values, and should be wired
        up once that table exists.
    """

    id: uuid.UUID
    email: str
    first_name: str | None = None
    last_name: str | None = None
    is_active: bool
    is_admin: bool
    created_at: datetime
    updated_at: datetime


class CurrentUserResponse(BaseModel):
    """Response body for ``GET /api/v1/users/me``."""

    success: bool = True
    message: str = "Current user retrieved successfully."
    data: UserResponse

class UserListResponse(BaseModel):
    """Response body for ``GET /api/v1/users``."""

    success: bool = True
    message: str = "Users retrieved successfully."
    data: list[UserResponse]

class AdminStatusUpdate(BaseModel):
    is_admin: bool

class UserAdminUpdateResponse(BaseModel):
    """Response body for ``PATCH /api/v1/users/{id}/admin``."""

    success: bool = True
    message: str = "User admin status updated successfully."
    data: UserResponse
