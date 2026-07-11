"""Lottery API endpoints (v1)."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_active_user
from app.core.database import get_db
from app.core.logging import get_logger
from app.models.lottery_game import LotteryGame
from app.models.lottery_result import LotteryResult
from app.models.user import User
from app.repositories.exceptions import DuplicateEntityError, EntityNotFoundError
from app.repositories.lottery_game_repository import LotteryGameRepository
from app.repositories.lottery_result_repository import LotteryResultRepository
from app.schemas.lottery import (
    CreateLotteryGameRequest,
    CreateLotteryResultRequest,
    DeleteResponse,
    LotteryGameDetailResponse,
    LotteryGameListResponse,
    LotteryGameResponse,
    LotteryResultDetailResponse,
    LotteryResultListResponse,
    LotteryResultResponse,
    UpdateLotteryResultRequest,
)
from app.services.lottery_service import LotteryService

logger = get_logger(__name__)
router = APIRouter(prefix="/lotteries", tags=["Lotteries"])


def get_lottery_service(db: Session = Depends(get_db)) -> LotteryService:
    """Provide a request-scoped ``LotteryService``."""
    return LotteryService(
        LotteryGameRepository(db),
        LotteryResultRepository(db),
    )


def map_game_to_response(game: LotteryGame) -> LotteryGameResponse:
    """Map LotteryGame ORM model to Pydantic schema."""
    return LotteryGameResponse(
        id=game.id,
        name=game.name,
        code=game.code,
        description=game.description,
        created_at=game.created_at,
        updated_at=game.updated_at,
    )


def map_result_to_response(result: LotteryResult) -> LotteryResultResponse:
    """Map LotteryResult ORM model to Pydantic schema."""
    return LotteryResultResponse(
        id=result.id,
        game_id=result.game_id,
        draw_date=result.draw_date,
        draw_number=result.draw_number,
        first_prize=result.first_prize,
        last2=result.last2,
        front3=result.front3,
        back3=result.back3,
        created_at=result.created_at,
        updated_at=result.updated_at,
    )


# --- Game Endpoints ---


@router.get(
    "/games",
    response_model=LotteryGameListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get all lottery games",
)
def list_games(
    current_user: User = Depends(get_current_active_user),
    service: LotteryService = Depends(get_lottery_service),
) -> LotteryGameListResponse:
    """Return all active lottery game types."""
    games = service.list_games()
    data = [map_game_to_response(g) for g in games]
    return LotteryGameListResponse(data=data)


@router.post(
    "/games",
    response_model=LotteryGameDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new lottery game type (Admin only)",
)
def create_game(
    payload: CreateLotteryGameRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    service: LotteryService = Depends(get_lottery_service),
) -> LotteryGameDetailResponse:
    """Create a new lottery game category. Requires admin privileges."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )

    try:
        game = service.create_game(
            payload.name,
            payload.code,
            payload.description,
        )
        db.commit()
        return LotteryGameDetailResponse(
            message="Lottery game created successfully.",
            data=map_game_to_response(game),
        )
    except DuplicateEntityError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc


@router.get(
    "/games/{game_id}",
    response_model=LotteryGameDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get lottery game details",
)
def get_game(
    game_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    service: LotteryService = Depends(get_lottery_service),
) -> LotteryGameDetailResponse:
    """Return the details of a specific lottery game type."""
    try:
        game = service.get_game(game_id)
        return LotteryGameDetailResponse(data=map_game_to_response(game))
    except EntityNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lottery game not found",
        ) from exc


# --- Result Endpoints ---


@router.post(
    "/results",
    response_model=LotteryResultDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a new draw result (Admin only)",
)
def create_result(
    payload: CreateLotteryResultRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    service: LotteryService = Depends(get_lottery_service),
) -> LotteryResultDetailResponse:
    """Record a new draw outcome. Requires admin privileges."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )

    try:
        result = service.create_result(
            payload.game_id,
            payload.draw_date,
            payload.first_prize,
            last2=payload.last2,
            front3=payload.front3,
            back3=payload.back3,
            draw_number=payload.draw_number,
        )
        db.commit()
        return LotteryResultDetailResponse(
            message="Draw result submitted successfully.",
            data=map_result_to_response(result),
        )
    except EntityNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except DuplicateEntityError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc


@router.get(
    "/results",
    response_model=LotteryResultListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get draw results for a game",
)
def list_results(
    game_id: uuid.UUID = Query(...),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_active_user),
    service: LotteryService = Depends(get_lottery_service),
) -> LotteryResultListResponse:
    """Return a paginated list of draw outcomes for a specific game."""
    try:
        results, total = service.list_results(
            game_id,
            limit=limit,
            offset=offset,
        )
        data = [map_result_to_response(r) for r in results]
        return LotteryResultListResponse(
            data=data,
            total=total,
            limit=limit,
            offset=offset,
        )
    except EntityNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lottery game not found",
        ) from exc


@router.get(
    "/results/latest",
    response_model=LotteryResultDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get latest draw result",
)
def get_latest_result(
    game_id: uuid.UUID = Query(...),
    current_user: User = Depends(get_current_active_user),
    service: LotteryService = Depends(get_lottery_service),
) -> LotteryResultDetailResponse:
    """Return the most recent draw outcome for a game."""
    try:
        result = service.get_latest_result(game_id)
        return LotteryResultDetailResponse(data=map_result_to_response(result))
    except EntityNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.get(
    "/results/{result_id}",
    response_model=LotteryResultDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get draw result details",
)
def get_result(
    result_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    service: LotteryService = Depends(get_lottery_service),
) -> LotteryResultDetailResponse:
    """Return the details of a specific draw result."""
    try:
        result = service.get_result(result_id)
        return LotteryResultDetailResponse(data=map_result_to_response(result))
    except EntityNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Draw result not found",
        ) from exc


@router.patch(
    "/results/{result_id}",
    response_model=LotteryResultDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a draw result (Admin only)",
)
def update_result(
    result_id: uuid.UUID,
    payload: UpdateLotteryResultRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    service: LotteryService = Depends(get_lottery_service),
) -> LotteryResultDetailResponse:
    """Update draw details. Requires admin privileges."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )

    try:
        result = service.update_result(
            result_id,
            draw_date=payload.draw_date,
            draw_number=payload.draw_number,
            first_prize=payload.first_prize,
            last2=payload.last2,
            front3=payload.front3,
            back3=payload.back3,
        )
        db.commit()
        return LotteryResultDetailResponse(
            message="Draw result updated successfully.",
            data=map_result_to_response(result),
        )
    except EntityNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Draw result not found",
        ) from exc


@router.delete(
    "/results/{result_id}",
    response_model=DeleteResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete a draw result (Admin only)",
)
def delete_result(
    result_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    service: LotteryService = Depends(get_lottery_service),
) -> DeleteResponse:
    """Soft delete a draw result. Requires admin privileges."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )

    try:
        service.delete_result(result_id)
        db.commit()
        return DeleteResponse(message="Draw result deleted successfully.")
    except EntityNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Draw result not found",
        ) from exc
