"""JWT creation and decoding utilities.

Built on python-jose. All tokens are timezone-aware UTC and carry the
standard registered claims required by CLAUDE.md: ``exp``, ``iat``,
``jti``, ``sub``, ``iss``, and ``aud``.
"""

from datetime import UTC, datetime, timedelta
from typing import Final
from uuid import uuid4

from jose import jwt
from jose.exceptions import ExpiredSignatureError, JWTClaimsError, JWTError

from app.core.config import get_settings
from app.security.exceptions import ExpiredTokenException, InvalidTokenException
from app.security.tokens import AccessToken, RefreshToken, TokenPayload

# Fixed issuer/audience for tokens minted by this application. These are
# not secrets, so they are defined here rather than in environment
# configuration.
TOKEN_ISSUER: Final[str] = "lucky-insight-api"
TOKEN_AUDIENCE: Final[str] = "lucky-insight-client"


def _build_claims(subject: str, expires_at: datetime, issued_at: datetime) -> dict[str, object]:
    """Assemble the standard registered claims for a token."""
    return {
        "sub": subject,
        "exp": expires_at,
        "iat": issued_at,
        "jti": str(uuid4()),
        "iss": TOKEN_ISSUER,
        "aud": TOKEN_AUDIENCE,
    }


def create_access_token(subject: str, expires_delta: timedelta | None = None) -> AccessToken:
    """Create a signed access token for the given subject (user ID)."""
    settings = get_settings()
    now = datetime.now(UTC)
    expire = now + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))

    claims = _build_claims(subject, expire, now)
    token = jwt.encode(claims, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    return AccessToken(token=token, expires_at=expire)


def create_refresh_token(subject: str, expires_delta: timedelta | None = None) -> RefreshToken:
    """Create a signed refresh token for the given subject (user ID)."""
    settings = get_settings()
    now = datetime.now(UTC)
    expire = now + (expires_delta or timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))

    claims = _build_claims(subject, expire, now)
    token = jwt.encode(claims, settings.JWT_REFRESH_SECRET, algorithm=settings.JWT_ALGORITHM)

    return RefreshToken(token=token, expires_at=expire)


def decode_token(token: str, secret: str) -> TokenPayload:
    """Decode and validate a JWT, verifying signature, expiry, issuer, and audience.

    Raises:
        ExpiredTokenException: If the token's ``exp`` claim is in the past.
        InvalidTokenException: If the signature, issuer, audience, or
            claim structure is invalid for any other reason.
    """
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=[settings.JWT_ALGORITHM],
            audience=TOKEN_AUDIENCE,
            issuer=TOKEN_ISSUER,
        )
    except ExpiredSignatureError as exc:
        raise ExpiredTokenException() from exc
    except (JWTClaimsError, JWTError) as exc:
        raise InvalidTokenException() from exc

    return TokenPayload(**payload)


def decode_access_token(token: str) -> TokenPayload:
    """Decode a token previously issued by :func:`create_access_token`."""
    settings = get_settings()
    return decode_token(token, settings.JWT_SECRET_KEY)


def decode_refresh_token(token: str) -> TokenPayload:
    """Decode a token previously issued by :func:`create_refresh_token`."""
    settings = get_settings()
    return decode_token(token, settings.JWT_REFRESH_SECRET)
