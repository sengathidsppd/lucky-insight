"""NumberRecord service layer.

Orchestrates business logic for recording numbers, managing tags,
and performing multi-criteria searches. Translates operations into
repository-level calls and raises domain-specific exceptions.
"""

import uuid
from collections.abc import Sequence
from datetime import datetime

from app.core.logging import get_logger
from app.models.number_category import NumberCategory
from app.models.number_record import NumberRecord
from app.models.number_source import NumberSource
from app.models.number_tag import NumberTag
from app.repositories.exceptions import EntityNotFoundError
from app.repositories.lookup_repository import LookupRepository
from app.repositories.number_record_repository import NumberRecordRepository
from app.repositories.number_tag_repository import NumberTagRepository
from app.services.exceptions import InvalidRecordDataError, RecordOwnershipError

logger = get_logger(__name__)


class NumberRecordService:
    """Business logic for number entries, tags, and lookup data."""

    def __init__(
        self,
        record_repository: NumberRecordRepository,
        tag_repository: NumberTagRepository,
        lookup_repository: LookupRepository,
    ) -> None:
        """Initialize the service with its repositories.

        Args:
            record_repository: Repo for number record persistence.
            tag_repository: Repo for user tag persistence.
            lookup_repository: Repo for reading lookup tables.
        """
        self._record_repository = record_repository
        self._tag_repository = tag_repository
        self._lookup_repository = lookup_repository

    # --- Record Operations ---

    def create_record(
        self,
        user_id: uuid.UUID,
        number: str,
        *,
        source_id: uuid.UUID | None = None,
        category_id: uuid.UUID | None = None,
        tag_ids: list[uuid.UUID] | None = None,
        note: str | None = None,
        recorded_at: datetime | None = None,
        is_favorite: bool = False,
    ) -> NumberRecord:
        """Create a new number record for a user.

        Args:
            user_id: The owning user's UUID.
            number: The observed number.
            source_id: Optional source UUID.
            category_id: Optional category UUID.
            tag_ids: Optional list of tag UUIDs.
            note: Optional description or note.
            recorded_at: Optional timestamp of the observation.
            is_favorite: Whether this record is marked as favorite.

        Returns:
            The created NumberRecord.

        Raises:
            InvalidRecordDataError: If source, category, or tag is invalid
                or not owned by the user.
        """
        # Validate source if provided
        if source_id is not None:
            source = self._lookup_repository.get_source_by_id(source_id)
            if source is None:
                raise InvalidRecordDataError("Invalid number source ID")

        # Validate category if provided
        if category_id is not None:
            category = self._lookup_repository.get_category_by_id(category_id)
            if category is None:
                raise InvalidRecordDataError("Invalid number category ID")

        # Validate tags if provided
        tags: list[NumberTag] = []
        if tag_ids:
            fetched_tags = self._tag_repository.get_by_ids(tag_ids)
            # Verify all tags exist and belong to this user
            if len(fetched_tags) != len(tag_ids):
                raise InvalidRecordDataError("One or more tag IDs are invalid")
            for t in fetched_tags:
                if t.user_id != user_id:
                    raise InvalidRecordDataError("One or more tag IDs do not belong to you")
            tags = list(fetched_tags)

        record_params = {
            "user_id": user_id,
            "number": number.strip(),
            "source_id": source_id,
            "category_id": category_id,
            "note": note,
            "is_favorite": is_favorite,
        }
        if recorded_at is not None:
            record_params["recorded_at"] = recorded_at

        record = NumberRecord(**record_params)
        record.tags = tags

        created = self._record_repository.create(record)
        logger.info(
            "Created number record id=%s for user_id=%s",
            created.id,
            user_id,
        )
        return created

    def update_record(
        self,
        user_id: uuid.UUID,
        record_id: uuid.UUID,
        *,
        number: str | None = None,
        source_id: uuid.UUID | None = None,
        category_id: uuid.UUID | None = None,
        tag_ids: list[uuid.UUID] | None = None,
        note: str | None = None,
        recorded_at: datetime | None = None,
        is_favorite: bool | None = None,
    ) -> NumberRecord:
        """Update an existing record.

        Args:
            user_id: The owning user's UUID (for ownership check).
            record_id: The UUID of the record to update.
            number: New number value.
            source_id: New source ID. Use UUID(int=0) or similar sentinel to clear?
                FastAPI Pydantic schema uses None to mean "do not update" or "set None".
                For simplicity: if explicitly provided in fields, update.
            category_id: New category ID.
            tag_ids: New list of tags.
            note: New note text.
            recorded_at: New observation timestamp.
            is_favorite: New favorite status.

        Returns:
            The updated record.

        Raises:
            EntityNotFoundError: If the record does not exist.
            RecordOwnershipError: If the record belongs to another user.
            InvalidRecordDataError: If the updated source, category, or tag is invalid.
        """
        record = self._record_repository.get_by_id(record_id)
        if record is None:
            raise EntityNotFoundError("Record not found")
        if record.user_id != user_id:
            raise RecordOwnershipError()

        if number is not None:
            record.number = number.strip()

        # Update source
        if source_id is not None:
            source = self._lookup_repository.get_source_by_id(source_id)
            if source is None:
                raise InvalidRecordDataError("Invalid number source ID")
            record.source_id = source_id
        elif source_id is None and "source_id" in locals():
            # If explicit None was passed to clear the field (we'll handle it carefully)
            pass

        # Update category
        if category_id is not None:
            category = self._lookup_repository.get_category_by_id(category_id)
            if category is None:
                raise InvalidRecordDataError("Invalid number category ID")
            record.category_id = category_id

        # Update tags
        if tag_ids is not None:
            fetched_tags = self._tag_repository.get_by_ids(tag_ids)
            if len(fetched_tags) != len(tag_ids):
                raise InvalidRecordDataError("One or more tag IDs are invalid")
            for t in fetched_tags:
                if t.user_id != user_id:
                    raise InvalidRecordDataError("One or more tag IDs do not belong to you")
            record.tags = list(fetched_tags)

        if note is not None:
            record.note = note

        if recorded_at is not None:
            record.recorded_at = recorded_at

        if is_favorite is not None:
            record.is_favorite = is_favorite

        updated = self._record_repository.update(record)
        logger.info(
            "Updated number record id=%s for user_id=%s",
            updated.id,
            user_id,
        )
        return updated

    def delete_record(self, user_id: uuid.UUID, record_id: uuid.UUID) -> bool:
        """Soft delete a number record.

        Args:
            user_id: The owning user's UUID.
            record_id: The UUID of the record to delete.

        Returns:
            True if deleted.

        Raises:
            EntityNotFoundError: If record is not found.
            RecordOwnershipError: If record does not belong to the user.
        """
        record = self._record_repository.get_by_id(record_id)
        if record is None:
            raise EntityNotFoundError("Record not found")
        if record.user_id != user_id:
            raise RecordOwnershipError()

        return self._record_repository.soft_delete(record_id)

    def get_record(self, user_id: uuid.UUID, record_id: uuid.UUID) -> NumberRecord:
        """Fetch a single record owned by the user.

        Args:
            user_id: The user's UUID.
            record_id: The record's UUID.

        Returns:
            The matching NumberRecord.

        Raises:
            EntityNotFoundError: If the record is not found or not owned.
        """
        record = self._record_repository.get_by_user_and_id(user_id, record_id)
        if record is None:
            raise EntityNotFoundError("Record not found")
        return record

    def list_records(
        self,
        user_id: uuid.UUID,
        *,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[Sequence[NumberRecord], int]:
        """Fetch a page of records for a user.

        Returns:
            A tuple of (records, total_count).
        """
        records = self._record_repository.get_by_user(
            user_id,
            limit=limit,
            offset=offset,
        )
        total = self._record_repository.count_by_user(user_id)
        return records, total

    def search_records(
        self,
        user_id: uuid.UUID,
        *,
        number: str | None = None,
        source_id: uuid.UUID | None = None,
        category_id: uuid.UUID | None = None,
        tag_ids: list[uuid.UUID] | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        keyword: str | None = None,
        is_favorite: bool | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[Sequence[NumberRecord], int]:
        """Search records with filters."""
        return self._record_repository.search(
            user_id,
            number=number,
            source_id=source_id,
            category_id=category_id,
            tag_ids=tag_ids,
            date_from=date_from,
            date_to=date_to,
            keyword=keyword,
            is_favorite=is_favorite,
            limit=limit,
            offset=offset,
        )

    def toggle_favorite(self, user_id: uuid.UUID, record_id: uuid.UUID) -> NumberRecord:
        """Toggle favorite status of a record.

        Returns:
            The updated NumberRecord.
        """
        record = self.get_record(user_id, record_id)
        new_val = not record.is_favorite
        return self._record_repository.set_favorite(
            record_id,
            user_id,
            is_favorite=new_val,
        )

    # --- Tag Operations ---

    def create_tag(self, user_id: uuid.UUID, name: str) -> NumberTag:
        """Create a new tag for the user.

        Raises:
            DuplicateEntityError: If tag already exists for the user.
        """
        tag = NumberTag(user_id=user_id, name=name.strip())
        return self._tag_repository.create_tag(tag)

    def list_tags(self, user_id: uuid.UUID) -> Sequence[NumberTag]:
        """Get all tags for the user."""
        return self._tag_repository.get_by_user(user_id)

    def delete_tag(self, user_id: uuid.UUID, tag_id: uuid.UUID) -> bool:
        """Delete a user's tag.

        Raises:
            EntityNotFoundError: If tag is not found or not owned.
        """
        tag = self._tag_repository.get_by_id(tag_id)
        if tag is None or tag.user_id != user_id:
            raise EntityNotFoundError("Tag not found")

        return self._tag_repository.soft_delete(tag_id)

    # --- Lookups ---

    def list_sources(self) -> Sequence[NumberSource]:
        """Get all system-wide sources."""
        return self._lookup_repository.get_all_sources()

    def list_categories(self) -> Sequence[NumberCategory]:
        """Get all system-wide categories."""
        return self._lookup_repository.get_all_categories()
