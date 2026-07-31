"""Pydantic models representing JWTs and their decoded payloads.

These models describe data shapes only; token creation and decoding logic
lives in ``jwt.py``.
"""

from datetime import datetime

from pydantic import BaseModel, Field


class TokenPayload(BaseModel):
    """The decoded claims of a JWT issued by this application."""

    sub: str = Field(description="Subject — the user ID the token was issued for")
    exp: datetime = Field(description="Expiration time (UTC)")
    iat: datetime = Field(description="Issued-at time (UTC)")
    jti: str = Field(description="Unique token identifier")
    iss: str = Field(description="Issuer")
    aud: str = Field(description="Intended audience")


class AccessToken(BaseModel):
    """An issued access token."""

    token: str
    token_type: str = "bearer"
    expires_at: datetime


class RefreshToken(BaseModel):
    """An issued refresh token."""

    token: str
    expires_at: datetime


class TokenResponse(BaseModel):
    """The token pair returned to a client after successful authentication.

    Intended for use by a future Login/Register API — not created by this
    task.
    """

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = Field(description="Access token lifetime, in seconds")
