"""Health check endpoints."""

from fastapi import APIRouter, Response
from pydantic import BaseModel

from app.services.health_service import DatabaseUnavailableError, check_database_connection

router = APIRouter(tags=["Health"])

APP_VERSION = "1.0.0"


class HealthResponse(BaseModel):
    """Response schema for the application health check endpoint."""

    status: str
    version: str


class DatabaseHealthResponse(BaseModel):
    """Response schema for the database health check endpoint."""

    status: str
    database: str


@router.get("/health", response_model=HealthResponse, status_code=200)
def health_check() -> HealthResponse:
    """Return the current health status of the API."""
    return HealthResponse(status="ok", version=APP_VERSION)


@router.get("/health/database", response_model=DatabaseHealthResponse)
def database_health_check(response: Response) -> DatabaseHealthResponse:
    """Return the current health status of the database connection.

    Returns HTTP 200 with ``database: connected`` when the database is
    reachable, or HTTP 503 with ``database: disconnected`` when it is not.
    """
    try:
        check_database_connection()
    except DatabaseUnavailableError:
        response.status_code = 503
        return DatabaseHealthResponse(status="error", database="disconnected")

    return DatabaseHealthResponse(status="ok", database="connected")
