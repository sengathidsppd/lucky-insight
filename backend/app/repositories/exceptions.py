"""Repository-domain exceptions.

Plain domain exceptions raised by the data access layer. Callers must
never see raw SQLAlchemy exceptions — repositories catch them and raise
one of these instead, per CLAUDE.md's error-handling rules ("Always catch
specific exceptions", "Never expose stack traces to users").
"""


class RepositoryError(Exception):
    """Base class for all repository-layer exceptions."""

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class EntityNotFoundError(RepositoryError):
    """Raised when an operation expects an entity that does not exist."""

    def __init__(self, message: str = "Entity not found") -> None:
        super().__init__(message)


class DuplicateEntityError(RepositoryError):
    """Raised when a uniqueness constraint (e.g. a unique email) is violated."""

    def __init__(self, message: str = "Entity already exists") -> None:
        super().__init__(message)
