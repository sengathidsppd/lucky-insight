"""Pydantic schemas for authentication API endpoints.

These describe request/response shapes only; validation here is a first
line of defense at the API boundary, in addition to (not instead of) the
domain-level checks already performed by ``AuthService`` and the
``User`` model.
"""

import uuid

from pydantic import BaseModel, EmailStr, Field, model_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, description="Minimum length: 8 characters")
    confirm_password: str | None = None
    first_name: str | None = Field(default="User", max_length=100)
    last_name: str | None = Field(default="", max_length=100)

    @model_validator(mode="after")
    def check_passwords_match(self) -> "RegisterRequest":
        """Ensure ``password`` and ``confirm_password`` are identical if confirm_password is provided."""
        if self.confirm_password is not None and self.password != self.confirm_password:
            raise ValueError("password and confirm_password must match")
        return self



class UserPublic(BaseModel):
    """Public-facing representation of a registered user."""

    id: uuid.UUID
    email: str
    first_name: str
    last_name: str
    is_active: bool
    is_admin: bool


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


class RefreshRequest(BaseModel):
    """Request body for ``POST /api/v1/auth/refresh``."""

    refresh_token: str = Field(min_length=1)


class RefreshResponse(BaseModel):
    """Response body for a successful token refresh."""

    success: bool = True
    message: str = "Token refreshed successfully."
    data: TokenData
