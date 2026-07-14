"""Pydantic schemas for the password reset API."""

from pydantic import BaseModel, EmailStr, Field


class ForgotPasswordRequest(BaseModel):
    """Request body for initiating a password reset."""

    email: EmailStr = Field(..., description="The registered email of the user.")


class ResetPasswordRequest(BaseModel):
    """Request body for confirming a password reset using a token."""

    token: str = Field(..., description="The temporary secure reset token.")
    new_password: str = Field(..., min_length=8, description="The new password (min 8 characters).")
