"""ORM models package.

Importing this package registers every model on ``Base.metadata``, which
Alembic's autogenerate support relies on. Add new models here as they are
created.
"""

from app.models.base import Base, BaseEntity
from app.models.lottery_game import LotteryGame
from app.models.lottery_result import LotteryResult
from app.models.number_category import NumberCategory
from app.models.number_record import NumberRecord
from app.models.number_source import NumberSource
from app.models.number_tag import NumberTag
from app.models.record_tag import record_tags
from app.models.user import User

__all__ = [
    "Base",
    "BaseEntity",
    "LotteryGame",
    "LotteryResult",
    "NumberCategory",
    "NumberRecord",
    "NumberSource",
    "NumberTag",
    "User",
    "record_tags",
]
