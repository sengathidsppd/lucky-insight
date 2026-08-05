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
from app.api.v1.ocr import router as ocr_v1_router
from app.api.v1.records import router as records_v1_router
from app.api.v1.tags import router as tags_v1_router
from app.api.v1.users import router as users_v1_router
from app.core.config import get_settings
from app.core.logging import configure_logging, get_logger

configure_logging()
logger = get_logger(__name__)

settings = get_settings()


import threading


def _initialize_db() -> None:
    """Run database table creation and default user seeding in a background thread."""
    try:
        from app.core.database import engine, SessionLocal
        from app.models.base import Base
        from app.models.user import User
        from app.security.password import hash_password
        import app.models  # noqa: F401

        logger.info("Ensuring database tables exist...")
        Base.metadata.create_all(bind=engine)

        db = SessionLocal()
        try:
            admin_email = "suzu@gmail.com"
            admin_pass = "suzu1234"
            default_user = db.query(User).filter(User.email == admin_email).first()
            if not default_user:
                db.add(
                    User(
                        email=admin_email,
                        password_hash=hash_password(admin_pass),
                        is_active=True,
                        is_admin=True,
                    )
                )
                db.commit()
                logger.info("Default user %s seeded successfully.", admin_email)
            else:
                default_user.password_hash = hash_password(admin_pass)
                default_user.is_active = True
                default_user.is_admin = True
                db.commit()
                logger.info("Default user %s updated successfully.", admin_email)

            # Remove extra seeded games if created by previous seed runs
            from app.models.lottery_game import LotteryGame
            db.query(LotteryGame).filter(
                (LotteryGame.code.in_(["THAI_GOV", "LAO_DEV"])) | (LotteryGame.name.like("%(หวย%"))
            ).delete(synchronize_session=False)
            db.commit()

        finally:
            db.close()



        logger.info("Database setup completed successfully.")
    except Exception as exc:
        logger.warning("Database init notice: %s", exc)




@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    """Handle application startup and shutdown events."""
    logger.info("Starting %s (env=%s)", settings.APP_NAME, settings.APP_ENV)
    # Run DB init in background thread so server boots in <100ms
    threading.Thread(target=_initialize_db, daemon=True).start()
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

cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r".*",
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


from app.api.v1.notifications import router as notifications_v1_router
from app.api.v1.tickets import router as tickets_v1_router

app.include_router(health_router)
app.include_router(health_router, prefix="/api/v1")

app.include_router(auth_v1_router, prefix="/api/v1")
app.include_router(users_v1_router, prefix="/api/v1")
app.include_router(lookups_v1_router, prefix="/api/v1")
app.include_router(tags_v1_router, prefix="/api/v1")
app.include_router(records_v1_router, prefix="/api/v1")
app.include_router(lotteries_v1_router, prefix="/api/v1")
app.include_router(analysis_v1_router, prefix="/api/v1")
app.include_router(dashboard_v1_router, prefix="/api/v1")
app.include_router(ocr_v1_router, prefix="/api/v1")
app.include_router(notifications_v1_router, prefix="/api/v1")
app.include_router(tickets_v1_router, prefix="/api/v1/tickets", tags=["Tickets"])


