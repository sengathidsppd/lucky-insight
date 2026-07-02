"""Health check endpoint."""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["Health"])

APP_VERSION = "1.0.0"


class HealthResponse(BaseModel):
    """Response schema for the health check endpoint."""

    status: str
    version: str


@router.get("/health", response_model=HealthResponse, status_code=200)
def health_check() -> HealthResponse:
    """Return the current health status of the API."""
    return HealthResponse(status="ok", version=APP_VERSION)
