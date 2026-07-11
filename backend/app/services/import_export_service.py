"""Import and export service layer."""

import csv
import io
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.models.number_category import NumberCategory
from app.models.number_record import NumberRecord
from app.models.number_source import NumberSource
from app.models.number_tag import NumberTag
from app.repositories.number_record_repository import NumberRecordRepository
from app.schemas.import_export import ImportErrorDetails

logger = get_logger(__name__)


class ImportExportService:
    """Handles CSV serialization for export and deserialization for import."""

    def __init__(
        self,
        session: Session,
        record_repository: NumberRecordRepository,
    ) -> None:
        """Initialize with dependencies.

        Args:
            session: Active SQLAlchemy session.
            record_repository: Record repository.
        """
        self._session = session
        self._record_repository = record_repository

    def export_records_to_csv(self, user_id: uuid.UUID) -> str:
        """Export all of a user's active records to a CSV string.

        Args:
            user_id: The UUID of the owner.

        Returns:
            CSV formatted string.
        """
        # Fetch all active records (limit 100,000)
        records, _ = self._record_repository.search(user_id, limit=100000)

        output = io.StringIO()
        writer = csv.writer(output)

        # Write header
        writer.writerow(
            [
                "number",
                "source",
                "category",
                "note",
                "is_favorite",
                "recorded_at",
                "tags",
            ]
        )

        # Write rows
        for r in records:
            source_name = r.source.name if r.source else ""
            category_name = r.category.name if r.category else ""
            tags_str = ",".join([t.name for t in r.tags])
            writer.writerow(
                [
                    r.number,
                    source_name,
                    category_name,
                    r.note or "",
                    str(r.is_favorite).lower(),
                    r.recorded_at.isoformat(),
                    tags_str,
                ]
            )

        return output.getvalue()

    def import_records_from_csv(
        self,
        user_id: uuid.UUID,
        csv_bytes: bytes,
    ) -> dict[str, Any]:
        """Import records from a CSV file.

        Creates categories, sources, and tags dynamically as required.

        Args:
            user_id: The UUID of the owner.
            csv_bytes: Raw bytes of the uploaded CSV.

        Returns:
            Dict containing count of imported, failed, and list of errors.
        """
        try:
            csv_text = csv_bytes.decode("utf-8")
        except UnicodeDecodeError:
            try:
                csv_text = csv_bytes.decode("cp1252")  # Common Excel Windows encoding
            except UnicodeDecodeError as exc:
                return {
                    "imported_count": 0,
                    "failed_count": 1,
                    "errors": [
                        ImportErrorDetails(
                            row=0,
                            error=f"Encoding error: Failed to decode CSV bytes: {exc}",
                        )
                    ],
                }

        reader = csv.DictReader(io.StringIO(csv_text))
        imported_count = 0
        failed_count = 0
        errors: list[ImportErrorDetails] = []

        # Validate headers
        required_headers = {"number"}
        if reader.fieldnames is None or not required_headers.issubset(reader.fieldnames):
            return {
                "imported_count": 0,
                "failed_count": 1,
                "errors": [
                    ImportErrorDetails(
                        row=0,
                        error="Invalid CSV headers. Must contain at least a 'number' column.",
                    )
                ],
            }

        # Process each row
        for i, row in enumerate(reader, start=2):
            try:
                number = (row.get("number") or "").strip()
                if not number:
                    raise ValueError("The 'number' column is empty or missing.")

                source_name = (row.get("source") or "").strip()
                category_name = (row.get("category") or "").strip()
                note = (row.get("note") or "").strip()
                fav_str = (row.get("is_favorite") or "").strip().lower()
                is_favorite = fav_str in {"true", "1", "yes", "y", "t"}

                rec_at_str = (row.get("recorded_at") or "").strip()
                recorded_at = datetime.now()
                if rec_at_str:
                    try:
                        recorded_at = datetime.fromisoformat(rec_at_str)
                    except ValueError:
                        pass  # Default to current time if parsing fails

                # Resolve FKs
                source_id = None
                if source_name:
                    source = self._get_or_create_source(source_name)
                    source_id = source.id

                category_id = None
                if category_name:
                    category = self._get_or_create_category(category_name)
                    category_id = category.id

                # Handle Tags
                tags_str = (row.get("tags") or "").strip()
                tags = []
                if tags_str:
                    for t_name in tags_str.split(","):
                        cleaned = t_name.strip()
                        if cleaned:
                            tags.append(self._get_or_create_tag(user_id, cleaned))

                # Create record
                record = NumberRecord(
                    user_id=user_id,
                    number=number,
                    source_id=source_id,
                    category_id=category_id,
                    note=note or None,
                    is_favorite=is_favorite,
                    recorded_at=recorded_at,
                    tags=tags,
                )
                self._record_repository.create(record)
                imported_count += 1

            except Exception as exc:
                failed_count += 1
                errors.append(ImportErrorDetails(row=i, error=str(exc)))

        return {
            "imported_count": imported_count,
            "failed_count": failed_count,
            "errors": errors,
        }

    # --- Helpers ---

    def _get_or_create_category(self, name: str) -> NumberCategory:
        name_stripped = name.strip()
        stmt = select(NumberCategory).where(
            func.lower(NumberCategory.name) == name_stripped.lower()
        )
        cat = self._session.execute(stmt).scalar_one_or_none()
        if not cat:
            cat = NumberCategory(name=name_stripped)
            self._session.add(cat)
            self._session.flush()
        return cat

    def _get_or_create_source(self, name: str) -> NumberSource:
        name_stripped = name.strip()
        stmt = select(NumberSource).where(func.lower(NumberSource.name) == name_stripped.lower())
        src = self._session.execute(stmt).scalar_one_or_none()
        if not src:
            src = NumberSource(name=name_stripped)
            self._session.add(src)
            self._session.flush()
        return src

    def _get_or_create_tag(self, user_id: uuid.UUID, name: str) -> NumberTag:
        name_stripped = name.strip()
        stmt = (
            select(NumberTag)
            .where(NumberTag.user_id == user_id)
            .where(func.lower(NumberTag.name) == name_stripped.lower())
        )
        tag = self._session.execute(stmt).scalar_one_or_none()
        if not tag:
            tag = NumberTag(user_id=user_id, name=name_stripped)
            self._session.add(tag)
            self._session.flush()
        return tag
