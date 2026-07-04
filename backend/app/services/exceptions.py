"""Service-layer domain exceptions.

Plain domain exceptions raised by the business/service layer. Like the
security and repository layers, services never raise
``fastapi.HTTPException`` and never return JSON — translating these into
HTTP responses is the responsibility of a future API layer.
"""


class ServiceError(Exception):
    """Base class for all service-layer exceptions."""

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class InvalidEmailFormatException(ServiceError):
    """Raised when a supplied email address is not a valid format."""

    def __init__(self, message: str = "Invalid email format") -> None:
        super().__init__(message)


class InactiveUserException(ServiceError):
    """Raised when an operation requires an active user account, but the
    account has been deactivated."""

    def __init__(self, message: str = "User account is inactive") -> None:
        super().__init__(message)
