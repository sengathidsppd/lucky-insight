"""Lucky Insight API application entrypoint."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api.health import router as health_router
from app.api.v1.analysis import router as analysis_v1_router
from app.api.v1.auth import router as auth_v1_router
from app.api.v1.dashboard import router as dashboard_v1_router
from app.api.v1.lookups import router as lookups_v1_router
from app.api.v1.lotteries import router as lotteries_v1_router
from app.api.v1.records import router as records_v1_router
from app.api.v1.tags import router as tags_v1_router
from app.api.v1.users import router as users_v1_router
from app.core.config import get_settings
from app.core.logging import configure_logging, get_logger

configure_logging()
logger = get_logger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    """Handle application startup and shutdown events."""
    logger.info("Starting %s (env=%s)", settings.APP_NAME, settings.APP_ENV)
    yield
    logger.info("Shutting down %s", settings.APP_NAME)


from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Lucky Insight API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Return HTTP 400 for request validation errors.

    FastAPI's default is HTTP 422; the project's API contract calls for
    400 Bad Request on validation failures instead. Only JSON-serializable
    error fields are included, since Pydantic's raw error context can
    hold non-serializable objects (e.g. the original exception instance).
    """
    errors = [
        {"loc": list(error["loc"]), "msg": error["msg"], "type": error["type"]}
        for error in exc.errors()
    ]
    return JSONResponse(
        status_code=400,
        content={"success": False, "message": "Validation failed.", "errors": errors},
    )


app.include_router(health_router)
app.include_router(auth_v1_router, prefix="/api/v1")
app.include_router(users_v1_router, prefix="/api/v1")
app.include_router(lookups_v1_router, prefix="/api/v1")
app.include_router(tags_v1_router, prefix="/api/v1")
app.include_router(records_v1_router, prefix="/api/v1")
app.include_router(lotteries_v1_router, prefix="/api/v1")
app.include_router(analysis_v1_router, prefix="/api/v1")
app.include_router(dashboard_v1_router, prefix="/api/v1")
