"""Security-domain exceptions.

These are plain domain exceptions, not FastAPI ``HTTPException``s. They
carry a user-safe message and are meant to be caught and translated into
HTTP responses by the API layer in a future task, keeping the API layer
thin and business/security logic decoupled from HTTP.
"""


class SecurityException(Exception):
    """Base class for all security-related exceptions."""

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class InvalidTokenException(SecurityException):
    """Raised when a token is malformed, has an invalid signature, or
    fails claim validation (issuer, audience, etc.)."""

    def __init__(self, message: str = "Invalid token") -> None:
        super().__init__(message)


class ExpiredTokenException(SecurityException):
    """Raised when a token's expiration (exp) claim is in the past."""

    def __init__(self, message: str = "Token has expired") -> None:
        super().__init__(message)


class InvalidCredentialsException(SecurityException):
    """Raised when a login attempt fails credential verification."""

    def __init__(self, message: str = "Invalid credentials") -> None:
        super().__init__(message)


class PermissionDeniedException(SecurityException):
    """Raised when an authenticated principal lacks permission for an
    action or resource."""

    def __init__(self, message: str = "Permission denied") -> None:
        super().__init__(message)
