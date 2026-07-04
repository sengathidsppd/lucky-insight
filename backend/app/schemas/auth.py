"""Pydantic schemas for authentication API endpoints.

These describe request/response shapes only; validation here is a first
line of defense at the API boundary, in addition to (not instead of) the
domain-level checks already performed by ``AuthService`` and the
``User`` model.
"""

import uuid

from pydantic import BaseModel, EmailStr, Field, model_validator


class RegisterRequest(BaseModel):
    """Request body for ``POST /api/v1/auth/register``.

    Note:
        ``first_name`` and ``last_name`` are accepted and validated here,
        but are not currently persisted: the ``users`` table stores only
        authentication credentials (see docs/DATABASE.md), and profile
        fields like a person's name belong to a separate ``profiles``
        table that does not exist yet. They are echoed back in the
        response as confirmation of what was submitted.
    """

    email: EmailStr
    password: str = Field(min_length=8, description="Minimum length: 8 characters")
    confirm_password: str
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)

    @model_validator(mode="after")
    def check_passwords_match(self) -> "RegisterRequest":
        """Ensure ``password`` and ``confirm_password`` are identical."""
        if self.password != self.confirm_password:
            raise ValueError("password and confirm_password must match")
        return self


class UserPublic(BaseModel):
    """Public-facing representation of a registered user."""

    id: uuid.UUID
    email: str
    first_name: str
    last_name: str
    is_active: bool


class RegisterResponse(BaseModel):
    """Response body for a successful registration."""

    success: bool = True
    message: str = "User registered successfully."
    data: UserPublic


class LoginRequest(BaseModel):
    """Request body for ``POST /api/v1/auth/login``."""

    email: EmailStr
    password: str = Field(min_length=1)


class TokenData(BaseModel):
    """Access/refresh token pair returned after a successful login."""

    access_token: str
    refresh_token: str
    token_type: str = "Bearer"


class LoginResponse(BaseModel):
    """Response body for a successful login."""

    success: bool = True
    message: str = "Login successful."
    data: TokenData
