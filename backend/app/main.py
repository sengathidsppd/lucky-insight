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

            # Seed Lottery Games and Results if empty
            from datetime import date
            from app.models.lottery_game import LotteryGame
            from app.models.lottery_result import LotteryResult

            thai_game = db.query(LotteryGame).filter(LotteryGame.code == "THAI_GOV").first()
            if not thai_game:
                thai_game = LotteryGame(
                    code="THAI_GOV",
                    name="Thai Government Lottery (หวยรัฐบาลไทย)",
                    description="Official Thai Government Lottery Draw Results",
                )
                db.add(thai_game)
                db.commit()
                db.refresh(thai_game)

            lao_game = db.query(LotteryGame).filter(LotteryGame.code == "LAO_DEV").first()
            if not lao_game:
                lao_game = LotteryGame(
                    code="LAO_DEV",
                    name="Lao Development Lottery (หวยพัฒนาลาว)",
                    description="Official Lao Development Lottery Draw Results",
                )
                db.add(lao_game)
                db.commit()
                db.refresh(lao_game)

            # Seed Thai Lottery Results if empty
            thai_count = db.query(LotteryResult).filter(LotteryResult.game_id == thai_game.id).count()
            if thai_count == 0:
                sample_thai_results = [
                    LotteryResult(game_id=thai_game.id, draw_date=date(2026, 7, 16), first_prize="931446", last2="44", front3="087, 392", back3="614, 004"),
                    LotteryResult(game_id=thai_game.id, draw_date=date(2026, 7, 1), first_prize="922605", last2="16", front3="867, 281", back3="947, 491"),
                    LotteryResult(game_id=thai_game.id, draw_date=date(2026, 6, 16), first_prize="518504", last2="31", front3="428, 879", back3="012, 456"),
                    LotteryResult(game_id=thai_game.id, draw_date=date(2026, 6, 1), first_prize="833605", last2="08", front3="507, 924", back3="231, 549"),
                    LotteryResult(game_id=thai_game.id, draw_date=date(2026, 5, 16), first_prize="205690", last2="60", front3="674, 918", back3="070, 132"),
                ]
                db.add_all(sample_thai_results)
                db.commit()

            # Seed Lao Lottery Results if empty
            lao_count = db.query(LotteryResult).filter(LotteryResult.game_id == lao_game.id).count()
            if lao_count == 0:
                sample_lao_results = [
                    LotteryResult(game_id=lao_game.id, draw_date=date(2026, 7, 29), first_prize="784512", last2="12", front3="784", back3="512"),
                    LotteryResult(game_id=lao_game.id, draw_date=date(2026, 7, 27), first_prize="391845", last2="45", front3="391", back3="845"),
                    LotteryResult(game_id=lao_game.id, draw_date=date(2026, 7, 24), first_prize="902634", last2="34", front3="902", back3="634"),
                    LotteryResult(game_id=lao_game.id, draw_date=date(2026, 7, 22), first_prize="158390", last2="90", front3="158", back3="390"),
                    LotteryResult(game_id=lao_game.id, draw_date=date(2026, 7, 20), first_prize="647218", last2="18", front3="647", back3="218"),
                ]
                db.add_all(sample_lao_results)
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


