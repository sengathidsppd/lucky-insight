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


class RecordOwnershipError(ServiceError):
    """Raised when a user attempts to access or modify a record they do not own."""

    def __init__(self, message: str = "You do not own this record") -> None:
        super().__init__(message)


class InvalidRecordDataError(ServiceError):
    """Raised when record creation or modification payload contains invalid data."""

    def __init__(self, message: str = "Invalid record data") -> None:
        super().__init__(message)
