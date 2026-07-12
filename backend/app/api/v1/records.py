"""Records API endpoints (v1).

Exposes CRUD, search, favorite, and tag operations for user's number
records. All endpoints require a valid active user session.
"""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_active_user
from app.core.database import get_db
from app.core.logging import get_logger
from app.models.number_record import NumberRecord
from app.models.user import User
from app.repositories.exceptions import EntityNotFoundError
from app.repositories.lookup_repository import LookupRepository
from app.repositories.number_record_repository import NumberRecordRepository
from app.repositories.number_tag_repository import NumberTagRepository
from app.schemas.import_export import ImportSummaryResponse
from app.schemas.record import (
    CategoryResponse,
    CreateRecordRequest,
    DeleteResponse,
    RecordDetailResponse,
    RecordListResponse,
    RecordResponse,
    SetRecordTagsRequest,
    SourceResponse,
    TagResponse,
    UpdateRecordRequest,
)
from app.services.exceptions import InvalidRecordDataError, RecordOwnershipError
from app.services.import_export_service import ImportExportService
from app.services.number_record_service import NumberRecordService

logger = get_logger(__name__)
router = APIRouter(prefix="/records", tags=["Records"])


def get_record_service(db: Session = Depends(get_db)) -> NumberRecordService:
    """Provide a request-scoped ``NumberRecordService``."""
    return NumberRecordService(
        NumberRecordRepository(db),
        NumberTagRepository(db),
        LookupRepository(db),
    )


def map_record_to_response(record: NumberRecord) -> RecordResponse:
    """Helper to convert ORM entity to Pydantic response schema."""
    source_data = None
    if record.source:
        source_data = SourceResponse(
            id=record.source.id,
            name=record.source.name,
            description=record.source.description,
        )
    category_data = None
    if record.category:
        category_data = CategoryResponse(
            id=record.category.id,
            name=record.category.name,
            description=record.category.description,
        )
    tags_data = [TagResponse(id=t.id, name=t.name, created_at=t.created_at) for t in record.tags]
    return RecordResponse(
        id=record.id,
        number=record.number,
        source=source_data,
        category=category_data,
        tags=tags_data,
        note=record.note,
        recorded_at=record.recorded_at,
        is_favorite=record.is_favorite,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


@router.post(
    "/",
    response_model=RecordDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new number record",
)
def create_record(
    payload: CreateRecordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    service: NumberRecordService = Depends(get_record_service),
) -> RecordDetailResponse:
    """Record a new observed number with optional categorization and tags.

    Raises:
        HTTPException: HTTP 400 if validation fails or source/category/tag IDs are invalid.
    """
    try:
        record = service.create_record(
            current_user.id,
            payload.number,
            source_id=payload.source_id,
            category_id=payload.category_id,
            tag_ids=payload.tag_ids,
            note=payload.note,
            recorded_at=payload.recorded_at,
            is_favorite=payload.is_favorite,
        )
        db.commit()
        return RecordDetailResponse(
            message="Record created successfully.",
            data=map_record_to_response(record),
        )
    except InvalidRecordDataError as exc:
        logger.info(
            "Record creation rejected for user_id=%s: %s",
            current_user.id,
            exc.message,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.get(
    "/",
    response_model=RecordListResponse,
    status_code=status.HTTP_200_OK,
    summary="List all records",
)
def list_records(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_active_user),
    service: NumberRecordService = Depends(get_record_service),
) -> RecordListResponse:
    """Return a paginated list of number records owned by the current user."""
    records, total = service.list_records(
        current_user.id,
        limit=limit,
        offset=offset,
    )
    data = [map_record_to_response(r) for r in records]
    return RecordListResponse(
        data=data,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/search",
    response_model=RecordListResponse,
    status_code=status.HTTP_200_OK,
    summary="Search records",
)
def search_records(
    number: str | None = Query(None),
    source_id: uuid.UUID | None = Query(None),
    category_id: uuid.UUID | None = Query(None),
    tag_ids: list[uuid.UUID] | None = Query(None),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    keyword: str | None = Query(None),
    is_favorite: bool | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_active_user),
    service: NumberRecordService = Depends(get_record_service),
) -> RecordListResponse:
    """Search number records matching any combination of filters."""
    records, total = service.search_records(
        current_user.id,
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
    data = [map_record_to_response(r) for r in records]
    return RecordListResponse(
        data=data,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/{record_id}",
    response_model=RecordDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get record details",
)
def get_record(
    record_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    service: NumberRecordService = Depends(get_record_service),
) -> RecordDetailResponse:
    """Return the details of a specific number record.

    Raises:
        HTTPException: HTTP 404 if record is not found or not owned.
    """
    try:
        record = service.get_record(current_user.id, record_id)
        return RecordDetailResponse(data=map_record_to_response(record))
    except EntityNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Record not found",
        ) from exc


@router.patch(
    "/{record_id}",
    response_model=RecordDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a record",
)
def update_record(
    record_id: uuid.UUID,
    payload: UpdateRecordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    service: NumberRecordService = Depends(get_record_service),
) -> RecordDetailResponse:
    """Update selected attributes of a number record.

    Raises:
        HTTPException: HTTP 404 if not found, 403 if forbidden,
            or 400 on validation errors.
    """
    try:
        record = service.update_record(
            current_user.id,
            record_id,
            number=payload.number,
            source_id=payload.source_id,
            category_id=payload.category_id,
            tag_ids=payload.tag_ids,
            note=payload.note,
            recorded_at=payload.recorded_at,
            is_favorite=payload.is_favorite,
        )
        db.commit()
        return RecordDetailResponse(
            message="Record updated successfully.",
            data=map_record_to_response(record),
        )
    except EntityNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Record not found",
        ) from exc
    except RecordOwnershipError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not own this record",
        ) from exc
    except InvalidRecordDataError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.delete(
    "/{record_id}",
    response_model=DeleteResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete a record",
)
def delete_record(
    record_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    service: NumberRecordService = Depends(get_record_service),
) -> DeleteResponse:
    """Soft-delete a number record.

    Raises:
        HTTPException: HTTP 404 if not found, or 403 if forbidden.
    """
    try:
        service.delete_record(current_user.id, record_id)
        db.commit()
        return DeleteResponse(message="Record deleted successfully.")
    except EntityNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Record not found",
        ) from exc
    except RecordOwnershipError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not own this record",
        ) from exc


@router.post(
    "/{record_id}/favorite",
    response_model=RecordDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Toggle favorite status",
)
def toggle_favorite(
    record_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    service: NumberRecordService = Depends(get_record_service),
) -> RecordDetailResponse:
    """Toggle the favorite flag of a record.

    Raises:
        HTTPException: HTTP 404 if not found, or 403 if forbidden.
    """
    try:
        record = service.toggle_favorite(current_user.id, record_id)
        db.commit()
        return RecordDetailResponse(
            message="Record favorite status updated.",
            data=map_record_to_response(record),
        )
    except EntityNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Record not found",
        ) from exc
    except RecordOwnershipError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not own this record",
        ) from exc


@router.put(
    "/{record_id}/tags",
    response_model=RecordDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Set record tags",
)
def set_record_tags(
    record_id: uuid.UUID,
    payload: SetRecordTagsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    service: NumberRecordService = Depends(get_record_service),
) -> RecordDetailResponse:
    """Replace all tags of a record with the new set of tags.

    Raises:
        HTTPException: HTTP 404 if not found, 403 if forbidden,
            or 400 on invalid tags.
    """
    try:
        record = service.update_record(
            current_user.id,
            record_id,
            tag_ids=payload.tag_ids,
        )
        db.commit()
        return RecordDetailResponse(
            message="Record tags updated successfully.",
            data=map_record_to_response(record),
        )
    except EntityNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Record not found",
        ) from exc
    except RecordOwnershipError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not own this record",
        ) from exc
    except InvalidRecordDataError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


def get_import_export_service(db: Session = Depends(get_db)) -> ImportExportService:
    """Provide a request-scoped ``ImportExportService``."""
    return ImportExportService(db, NumberRecordRepository(db))


@router.get(
    "/export/csv",
    summary="Export all records to CSV",
)
def export_csv(
    current_user: User = Depends(get_current_active_user),
    service: ImportExportService = Depends(get_import_export_service),
) -> Response:
    """Export all user's number records as a CSV download."""
    csv_data = service.export_records_to_csv(current_user.id)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": (
                f"attachment; filename=records_export_"
                f"{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            )
        },
    )


@router.post(
    "/import/csv",
    response_model=ImportSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Import records from a CSV file",
)
def import_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    service: ImportExportService = Depends(get_import_export_service),
) -> ImportSummaryResponse:
    """Upload and import number records from a CSV file."""
    content = file.file.read()
    result = service.import_records_from_csv(current_user.id, content)
    db.commit()
    return ImportSummaryResponse(
        imported_count=result["imported_count"],
        failed_count=result["failed_count"],
        errors=result["errors"],
    )
