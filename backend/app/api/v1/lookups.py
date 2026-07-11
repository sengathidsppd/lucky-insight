"""Lookups API endpoints (v1).

Exposes system-wide source and category tables. Anyone with a valid,
active account can view these lookups.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_active_user
from app.core.database import get_db
from app.models.user import User
from app.repositories.lookup_repository import LookupRepository
from app.repositories.number_record_repository import NumberRecordRepository
from app.repositories.number_tag_repository import NumberTagRepository
from app.schemas.record import (
    CategoryListResponse,
    CategoryResponse,
    SourceListResponse,
    SourceResponse,
)
from app.services.number_record_service import NumberRecordService

router = APIRouter(prefix="/lookups", tags=["Lookups"])


def get_record_service(db: Session = Depends(get_db)) -> NumberRecordService:
    """Provide a request-scoped ``NumberRecordService``."""
    return NumberRecordService(
        NumberRecordRepository(db),
        NumberTagRepository(db),
        LookupRepository(db),
    )


@router.get(
    "/sources",
    response_model=SourceListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get all number sources",
)
def list_sources(
    current_user: User = Depends(get_current_active_user),
    service: NumberRecordService = Depends(get_record_service),
) -> SourceListResponse:
    """Return the list of system-predefined number sources."""
    sources = service.list_sources()
    data = [SourceResponse(id=s.id, name=s.name, description=s.description) for s in sources]
    return SourceListResponse(data=data)


@router.get(
    "/categories",
    response_model=CategoryListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get all number categories",
)
def list_categories(
    current_user: User = Depends(get_current_active_user),
    service: NumberRecordService = Depends(get_record_service),
) -> CategoryListResponse:
    """Return the list of system-predefined number categories."""
    categories = service.list_categories()
    data = [CategoryResponse(id=c.id, name=c.name, description=c.description) for c in categories]
    return CategoryListResponse(data=data)
