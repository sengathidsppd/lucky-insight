"""User ORM model.

Stores authentication credentials only. Profile information (display
name, avatar, theme, language, etc.) lives in a separate ``profiles``
table, per docs/DATABASE.md, and is out of scope for this model.
"""

import re
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column, validates

from app.models.base import BaseEntity

MAX_EMAIL_LENGTH = 255

# A pragmatic, readable email-format check. Full RFC 5322 validation is
# handled at the API boundary (Pydantic / email-validator); this is a
# defense-in-depth guard at the model layer.
_EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class User(BaseEntity):
    """A registered user account."""

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(
        String(MAX_EMAIL_LENGTH),
        unique=True,
        index=True,
        nullable=False,
    )
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        default=None,
        nullable=True,
    )

    @validates("email")
    def validate_email(self, key: str, value: str) -> str:
        """Enforce a basic email format and the maximum column length."""
        if not value or len(value) > MAX_EMAIL_LENGTH:
            raise ValueError(f"email must be between 1 and {MAX_EMAIL_LENGTH} characters")
        if not _EMAIL_PATTERN.match(value):
            raise ValueError(f"email is not a valid email address: {value!r}")
        return value

    @validates("password_hash")
    def validate_password_hash(self, key: str, value: str) -> str:
        """Ensure the password hash is never empty."""
        if not value or not value.strip():
            raise ValueError("password_hash cannot be empty")
        return value

    def __repr__(self) -> str:
        return f"<User id={self.id!r} email={self.email!r} is_active={self.is_active!r}>"
