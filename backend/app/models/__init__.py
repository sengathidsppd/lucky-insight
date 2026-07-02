"""ORM models package.

Importing this package registers every model on ``Base.metadata``, which
Alembic's autogenerate support relies on. Add new models here as they are
created.
"""

from app.models.base import Base, BaseEntity
from app.models.user import User

__all__ = ["Base", "BaseEntity", "User"]
