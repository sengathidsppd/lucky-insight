"""Tags API endpoints (v1).

Exposes user-defined tags management. All endpoints require a valid
active user session.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_active_user
from app.core.database import get_db
from app.core.logging import get_logger
from app.models.user import User
from app.repositories.exceptions import DuplicateEntityError, EntityNotFoundError
from app.repositories.lookup_repository import LookupRepository
from app.repositories.number_record_repository import NumberRecordRepository
from app.repositories.number_tag_repository import NumberTagRepository
from app.schemas.record import (
    CreateTagRequest,
    DeleteResponse,
    TagDetailResponse,
    TagListResponse,
    TagResponse,
)
from app.services.number_record_service import NumberRecordService

logger = get_logger(__name__)
router = APIRouter(prefix="/tags", tags=["Tags"])


def get_record_service(db: Session = Depends(get_db)) -> NumberRecordService:
    """Provide a request-scoped ``NumberRecordService``."""
    return NumberRecordService(
        NumberRecordRepository(db),
        NumberTagRepository(db),
        LookupRepository(db),
    )


@router.post(
    "",
    response_model=TagDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new tag",
)
def create_tag(
    payload: CreateTagRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    service: NumberRecordService = Depends(get_record_service),
) -> TagDetailResponse:
    """Create a new user-defined tag.

    Raises:
        HTTPException: HTTP 409 if a tag with this name already exists
            for the current user.
    """
    try:
        tag = service.create_tag(current_user.id, payload.name)
        db.commit()
        return TagDetailResponse(
            message="Tag created successfully.",
            data=TagResponse(id=tag.id, name=tag.name, created_at=tag.created_at),
        )
    except DuplicateEntityError as exc:
        logger.info(
            "Tag creation rejected for user_id=%s: tag name already exists",
            current_user.id,
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc


@router.get(
    "",
    response_model=TagListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get all tags",
)
def list_tags(
    current_user: User = Depends(get_current_active_user),
    service: NumberRecordService = Depends(get_record_service),
) -> TagListResponse:
    """Return all tags defined by the current user."""
    tags = service.list_tags(current_user.id)
    data = [TagResponse(id=t.id, name=t.name, created_at=t.created_at) for t in tags]
    return TagListResponse(data=data)


@router.delete(
    "/{tag_id}",
    response_model=DeleteResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete a tag",
)
def delete_tag(
    tag_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    service: NumberRecordService = Depends(get_record_service),
) -> DeleteResponse:
    """Soft-delete a user-defined tag.

    Raises:
        HTTPException: HTTP 404 if the tag does not exist or does not
            belong to the current user.
    """
    try:
        service.delete_tag(current_user.id, tag_id)
        db.commit()
        return DeleteResponse(message="Tag deleted successfully.")
    except EntityNotFoundError as exc:
        logger.info(
            "Tag deletion rejected: tag_id=%s not found or not owned by user_id=%s",
            tag_id,
            current_user.id,
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found",
        ) from exc
