"""Password hashing utilities.

Uses Argon2 (via argon2-cffi), per CLAUDE.md's security rules. These are
pure, reusable functions with no knowledge of HTTP, the database, or any
particular user model.
"""

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

_password_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    """Hash a plaintext password using Argon2.

    Raises:
        ValueError: If the password is empty.
    """
    if not password:
        raise ValueError("password cannot be empty")
    return _password_hasher.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    """Verify a plaintext password against an Argon2 hash.

    Returns False for any mismatch or malformed hash rather than raising,
    so callers can treat verification as a simple boolean check.
    """
    try:
        return _password_hasher.verify(hashed, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False
