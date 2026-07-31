"""Dashboard service layer."""

import uuid
from dataclasses import dataclass
from collections.abc import Sequence

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.models.analysis_job import AnalysisJob
from app.models.number_category import NumberCategory
from app.models.number_record import NumberRecord
from app.models.number_source import NumberSource
from app.repositories.analysis_repository import AnalysisRepository
from app.repositories.number_record_repository import NumberRecordRepository
from app.schemas.dashboard import (
    CategoryCountResponse,
    SourceCountResponse,
)

logger = get_logger(__name__)


@dataclass
class DashboardData:
    """Decoupled dashboard summary structure containing ORM entities."""

    total_records: int
    total_favorites: int
    records_by_category: list[CategoryCountResponse]
    records_by_source: list[SourceCountResponse]
    recent_records: Sequence[NumberRecord]
    recent_analysis_jobs: Sequence[AnalysisJob]


class DashboardService:
    """Computes aggregated dashboard statistics for a user."""

    def __init__(
        self,
        session: Session,
        record_repository: NumberRecordRepository,
        analysis_repository: AnalysisRepository,
    ) -> None:
        """Initialize the dashboard service.

        Args:
            session: Active database session.
            record_repository: Record repository.
            analysis_repository: Analysis repository.
        """
        self._session = session
        self._record_repository = record_repository
        self._analysis_repository = analysis_repository

    def get_summary(self, user_id: uuid.UUID) -> DashboardData:
        """Fetch total counts, distributions, recent records, and recent jobs.

        Args:
            user_id: The UUID of the authenticated user.

        Returns:
            DashboardData object.
        """
        # 1. Total records count
        total_records_stmt = (
            select(func.count(NumberRecord.id))
            .where(NumberRecord.user_id == user_id)
            .where(NumberRecord.deleted_at.is_(None))
        )
        total_records = self._session.execute(total_records_stmt).scalar() or 0

        # 2. Total favorites count
        total_fav_stmt = (
            select(func.count(NumberRecord.id))
            .where(NumberRecord.user_id == user_id)
            .where(NumberRecord.is_favorite.is_(True))
            .where(NumberRecord.deleted_at.is_(None))
        )
        total_favorites = self._session.execute(total_fav_stmt).scalar() or 0

        # 3. Counts by category
        cat_stmt = (
            select(NumberCategory.name, func.count(NumberRecord.id))
            .join(NumberCategory, NumberRecord.category_id == NumberCategory.id)
            .where(NumberRecord.user_id == user_id)
            .where(NumberRecord.deleted_at.is_(None))
            .where(NumberCategory.deleted_at.is_(None))
            .group_by(NumberCategory.name)
        )
        cat_rows = self._session.execute(cat_stmt).all()
        records_by_category = [
            CategoryCountResponse(category_name=row[0], count=row[1]) for row in cat_rows
        ]

        # 4. Counts by source
        src_stmt = (
            select(NumberSource.name, func.count(NumberRecord.id))
            .join(NumberSource, NumberRecord.source_id == NumberSource.id)
            .where(NumberRecord.user_id == user_id)
            .where(NumberRecord.deleted_at.is_(None))
            .where(NumberSource.deleted_at.is_(None))
            .group_by(NumberSource.name)
        )
        src_rows = self._session.execute(src_stmt).all()
        records_by_source = [
            SourceCountResponse(source_name=row[0], count=row[1]) for row in src_rows
        ]

        # 5. Recent records (limit 5)
        recent_recs, _ = self._record_repository.search(user_id, limit=5)

        # 6. Recent analysis jobs (limit 5)
        recent_jobs = self._analysis_repository.get_by_user(user_id, limit=5)

        return DashboardData(
            total_records=total_records,
            total_favorites=total_favorites,
            records_by_category=records_by_category,
            records_by_source=records_by_source,
            recent_records=recent_recs,
            recent_analysis_jobs=recent_jobs,
        )
