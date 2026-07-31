"""Lottery service layer."""

import uuid
from collections.abc import Sequence
from datetime import date

from app.core.logging import get_logger
from app.models.lottery_game import LotteryGame
from app.models.lottery_result import LotteryResult
from app.repositories.exceptions import DuplicateEntityError, EntityNotFoundError
from app.repositories.lottery_game_repository import LotteryGameRepository
from app.repositories.lottery_result_repository import LotteryResultRepository

logger = get_logger(__name__)


class LotteryService:
    """Business logic for managing lottery games and draw results."""

    def __init__(
        self,
        game_repository: LotteryGameRepository,
        result_repository: LotteryResultRepository,
    ) -> None:
        """Initialize the service with its repositories.

        Args:
            game_repository: Repo for LotteryGame entities.
            result_repository: Repo for LotteryResult entities.
        """
        self._game_repository = game_repository
        self._result_repository = result_repository

    # --- Game Operations ---

    def create_game(
        self,
        name: str,
        code: str,
        description: str | None = None,
    ) -> LotteryGame:
        """Create a new lottery game category.

        Args:
            name: The display name (e.g. 'Thai Government Lottery').
            code: Unique identifier code (e.g. 'THAI').
            description: Optional details.

        Returns:
            The created LotteryGame.

        Raises:
            DuplicateEntityError: If a game with the same code already exists.
        """
        normalized_code = code.strip().upper()
        if self._game_repository.get_by_code(normalized_code) is not None:
            raise DuplicateEntityError(f"Lottery game with code '{normalized_code}' already exists")

        game = LotteryGame(
            name=name.strip(),
            code=normalized_code,
            description=description,
        )
        created = self._game_repository.create(game)
        logger.info("Created lottery game id=%s code=%s", created.id, created.code)
        return created

    def update_game(
        self,
        game_id: uuid.UUID,
        *,
        name: str | None = None,
        code: str | None = None,
        description: str | None = None,
    ) -> LotteryGame:
        """Update an existing lottery game.

        Raises:
            EntityNotFoundError: If game does not exist.
            DuplicateEntityError: If updated code conflicts with another game.
        """
        game = self._game_repository.get_by_id(game_id)
        if game is None:
            raise EntityNotFoundError("Lottery game not found")

        if name is not None:
            game.name = name.strip()

        if code is not None:
            normalized_code = code.strip().upper()
            if normalized_code != game.code:
                if self._game_repository.get_by_code(normalized_code) is not None:
                    raise DuplicateEntityError(
                        f"Lottery game with code '{normalized_code}' already exists"
                    )
                game.code = normalized_code

        if description is not None:
            game.description = description

        updated = self._game_repository.update(game)
        logger.info("Updated lottery game id=%s", updated.id)
        return updated

    def delete_game(self, game_id: uuid.UUID) -> bool:
        """Soft delete a lottery game.

        Raises:
            EntityNotFoundError: If game does not exist.
        """
        if not self._game_repository.exists(game_id):
            raise EntityNotFoundError("Lottery game not found")
        return self._game_repository.soft_delete(game_id)

    def get_game(self, game_id: uuid.UUID) -> LotteryGame:
        """Get a single lottery game by ID.

        Raises:
            EntityNotFoundError: If game does not exist.
        """
        game = self._game_repository.get_by_id(game_id)
        if game is None:
            raise EntityNotFoundError("Lottery game not found")
        return game

    def list_games(self) -> Sequence[LotteryGame]:
        """List all active lottery games."""
        return self._game_repository.get_all()

    # --- Draw Result Operations ---

    def create_result(
        self,
        game_id: uuid.UUID,
        draw_date: date,
        first_prize: str,
        *,
        last2: str | None = None,
        front3: str | None = None,
        back3: str | None = None,
        draw_number: str | None = None,
    ) -> LotteryResult:
        """Record a new draw outcome.

        Raises:
            EntityNotFoundError: If game does not exist.
            DuplicateEntityError: If a draw result already exists for the game and date.
        """
        if not self._game_repository.exists(game_id):
            raise EntityNotFoundError("Lottery game not found")

        if self._result_repository.get_by_game_and_date(game_id, draw_date) is not None:
            raise DuplicateEntityError(
                f"A draw result already exists for game_id={game_id} and date={draw_date}"
            )

        result = LotteryResult(
            game_id=game_id,
            draw_date=draw_date,
            draw_number=draw_number,
            first_prize=first_prize,
            last2=last2,
            front3=front3,
            back3=back3,
        )
        created = self._result_repository.create(result)
        logger.info(
            "Recorded draw result id=%s for game_id=%s date=%s",
            created.id,
            game_id,
            draw_date,
        )
        return created

    def update_result(
        self,
        result_id: uuid.UUID,
        *,
        draw_date: date | None = None,
        draw_number: str | None = None,
        first_prize: str | None = None,
        last2: str | None = None,
        front3: str | None = None,
        back3: str | None = None,
    ) -> LotteryResult:
        """Update an existing draw outcome.

        Raises:
            EntityNotFoundError: If result does not exist.
        """
        result = self._result_repository.get_by_id(result_id)
        if result is None:
            raise EntityNotFoundError("Draw result not found")

        if draw_date is not None:
            result.draw_date = draw_date

        if draw_number is not None:
            result.draw_number = draw_number

        if first_prize is not None:
            result.first_prize = first_prize

        if last2 is not None:
            result.last2 = last2

        if front3 is not None:
            result.front3 = front3

        if back3 is not None:
            result.back3 = back3

        updated = self._result_repository.update(result)
        logger.info("Updated draw result id=%s", updated.id)
        return updated

    def delete_result(self, result_id: uuid.UUID) -> bool:
        """Soft delete a draw outcome.

        Raises:
            EntityNotFoundError: If result does not exist.
        """
        if not self._result_repository.exists(result_id):
            raise EntityNotFoundError("Draw result not found")
        return self._result_repository.soft_delete(result_id)

    def get_result(self, result_id: uuid.UUID) -> LotteryResult:
        """Get a single draw result by ID.

        Raises:
            EntityNotFoundError: If result does not exist.
        """
        result = self._result_repository.get_by_id(result_id)
        if result is None:
            raise EntityNotFoundError("Draw result not found")
        return result

    def list_results(
        self,
        game_id: uuid.UUID,
        *,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[Sequence[LotteryResult], int]:
        """List paginated draw results for a game.

        Returns:
            A tuple of (results, total_count).
        """
        results = self._result_repository.list_by_game(
            game_id,
            limit=limit,
            offset=offset,
        )
        total = self._result_repository.count_by_game(game_id)
        return results, total

    def get_latest_result(self, game_id: uuid.UUID) -> LotteryResult:
        """Get the most recent draw outcome for a game.

        Raises:
            EntityNotFoundError: If no draws exist for this game.
        """
        result = self._result_repository.get_latest_draw(game_id)
        if result is None:
            raise EntityNotFoundError("No draw results found for this game")
        return result
