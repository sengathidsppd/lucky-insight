"""Statistical analysis service layer."""

import itertools
import uuid
from collections import Counter
from collections.abc import Sequence
from datetime import datetime
from typing import Any

from app.core.logging import get_logger
from app.models.analysis_job import AnalysisJob
from app.models.analysis_result import AnalysisResult
from app.models.number_record import NumberRecord
from app.repositories.analysis_repository import AnalysisRepository
from app.repositories.exceptions import EntityNotFoundError
from app.repositories.lottery_result_repository import LotteryResultRepository
from app.repositories.number_record_repository import NumberRecordRepository

logger = get_logger(__name__)


class AnalysisService:
    """Orchestrates statistical analysis calculations and explanation generation."""

    def __init__(
        self,
        analysis_repository: AnalysisRepository,
        record_repository: NumberRecordRepository,
        lottery_result_repository: LotteryResultRepository,
    ) -> None:
        """Initialize the service with required repositories."""
        self._analysis_repository = analysis_repository
        self._record_repository = record_repository
        self._lottery_result_repository = lottery_result_repository

    def create_and_run_analysis(
        self,
        user_id: uuid.UUID,
        analysis_type: str,
        parameters: dict[str, Any] | None = None,
    ) -> AnalysisJob:
        """Create an analysis job, run the statistical calculation, and save results.

        This runs synchronously for simplicity and fast execution.
        """
        # Create PENDING job
        job = AnalysisJob(
            user_id=user_id,
            analysis_type=analysis_type.upper(),
            status="RUNNING",
            parameters=parameters,
        )
        self._analysis_repository.create(job)

        try:
            params = parameters or {}
            source_id = params.get("source_id")
            category_id = params.get("category_id")
            date_from_str = params.get("date_from")
            date_to_str = params.get("date_to")
            game_id_str = params.get("game_id")

            src_uuid = uuid.UUID(source_id) if source_id else None
            cat_uuid = uuid.UUID(category_id) if category_id else None
            dt_from = datetime.fromisoformat(date_from_str) if date_from_str else None
            dt_to = datetime.fromisoformat(date_to_str) if date_to_str else None
            game_id = uuid.UUID(game_id_str) if game_id_str else None

            # Retrieve user's records (up to 50,000 for safety)
            user_records, _ = self._record_repository.search(
                user_id,
                source_id=src_uuid,
                category_id=cat_uuid,
                date_from=dt_from,
                date_to=dt_to,
                limit=50000,
            )

            from types import SimpleNamespace
            combined_records = [SimpleNamespace(number=r.number) for r in user_records]

            # If game_id is provided, also fetch official draw results and merge them!
            if game_id:
                from sqlalchemy import select
                from app.models.lottery_result import LotteryResult

                stmt = select(LotteryResult).where(LotteryResult.game_id == game_id).where(LotteryResult.deleted_at.is_(None))
                if dt_from:
                    stmt = stmt.where(LotteryResult.draw_date >= dt_from.date())
                if dt_to:
                    stmt = stmt.where(LotteryResult.draw_date <= dt_to.date())
                stmt = stmt.order_by(LotteryResult.draw_date.desc()).limit(50000)

                results = self._lottery_result_repository._session.execute(stmt).scalars().all()
                combined_records.extend([SimpleNamespace(number=r.first_prize) for r in results])

            if not combined_records:
                raise ValueError("No records or official draw results found matching the specified filters.")

            # 2. Perform calculation based on type
            result_data: dict[str, Any] = {}
            explanation = ""

            if job.analysis_type == "FREQUENCY":
                result_data, explanation = self._calculate_frequency(combined_records)
            elif job.analysis_type == "PAIR":
                result_data, explanation = self._calculate_pairs(combined_records)
            elif job.analysis_type == "TRIPLE":
                result_data, explanation = self._calculate_triplets(combined_records)
            elif job.analysis_type == "DISTRIBUTION":
                result_data, explanation = self._calculate_distribution(combined_records)
            else:
                raise ValueError(f"Unsupported analysis type: {analysis_type}")

            # 3. Optional comparison with official lottery draw results
            # Only run comparison if we have user records to check against official draws
            if game_id and user_records:
                compare_data = self._compare_with_lottery(user_records, game_id)
                result_data["lottery_comparison"] = compare_data
                explanation += (
                    f" Additionally, compared against the lottery draws, "
                    f"you had {compare_data['match_count']} matching numbers."
                )

            # Save result
            result = AnalysisResult(
                job_id=job.id,
                result_data=result_data,
                explanation=explanation,
            )
            self._analysis_repository.create_result(result)

            # Update job status
            job.status = "COMPLETED"
            self._analysis_repository.update(job)

        except Exception as exc:
            logger.error("Analysis job failed: %s", str(exc))
            job.status = "FAILED"
            job.error_message = str(exc)
            self._analysis_repository.update(job)

        return self._analysis_repository.get_job_with_result(job.id)  # type: ignore

    def get_job(self, user_id: uuid.UUID, job_id: uuid.UUID) -> AnalysisJob:
        """Fetch a single job, checking ownership."""
        job = self._analysis_repository.get_job_with_result(job_id)
        if job is None or job.user_id != user_id:
            raise EntityNotFoundError("Analysis job not found")
        return job

    def list_jobs(
        self,
        user_id: uuid.UUID,
        *,
        limit: int = 20,
        offset: int = 0,
    ) -> Sequence[AnalysisJob]:
        """List all analysis jobs for a user."""
        return self._analysis_repository.get_by_user(
            user_id,
            limit=limit,
            offset=offset,
        )

    # --- Calculations ---

    def _calculate_frequency(
        self,
        records: Sequence[NumberRecord],
    ) -> tuple[dict[str, Any], str]:
        """Calculate frequency of single digits and endings of length 1 to 6."""
        all_digits = []
        endings_map = {length: [] for length in range(1, 7)}

        for r in records:
            num_str = r.number.strip()
            # Digits
            for char in num_str:
                if char.isdigit():
                    all_digits.append(char)
            # Endings of lengths 1 to 6
            cleaned_num = "".join([c for c in num_str if c.isdigit()])
            for length in range(1, 7):
                if len(cleaned_num) >= length:
                    endings_map[length].append(cleaned_num[-length:])

        digit_counts = Counter(all_digits)
        top_digits = [{"digit": d, "count": c} for d, c in digit_counts.most_common(10)]

        result_data = {
            "total_records_analyzed": len(records),
            "top_single_digits": top_digits,
        }

        # Add endings of length 1 to 6
        for length in range(1, 7):
            ending_counts = Counter(endings_map[length])
            result_data[f"top_{length}digit_endings"] = [
                {"combination": comb, "count": c} for comb, c in ending_counts.most_common(10)
            ]

        most_freq_digit = top_digits[0]["digit"] if top_digits else "N/A"
        most_freq_digit_cnt = top_digits[0]["count"] if top_digits else 0
        most_freq_2d = (
            result_data["top_2digit_endings"][0]["combination"]
            if result_data["top_2digit_endings"]
            else "N/A"
        )

        explanation = (
            f"Analyzed {len(records)} records. The most frequent single digit is "
            f"'{most_freq_digit}' appearing {most_freq_digit_cnt} times. "
            f"The most common 2-digit ending is '{most_freq_2d}'."
        )

        return result_data, explanation

    def _calculate_pairs(
        self,
        records: Sequence[NumberRecord],
    ) -> tuple[dict[str, Any], str]:
        """Find the most common pairs of digits appearing together in numbers."""
        pairs = []

        for r in records:
            digits = sorted([c for c in r.number if c.isdigit()])
            # Unique undirected pairs in the number
            for p in itertools.combinations(set(digits), 2):
                pairs.append(f"{p[0]},{p[1]}")

        pair_counts = Counter(pairs)
        top_pairs = [{"pair": p, "count": c} for p, c in pair_counts.most_common(10)]

        result_data = {
            "total_records_analyzed": len(records),
            "top_digit_pairs": top_pairs,
        }

        most_common_pair = top_pairs[0]["pair"] if top_pairs else "N/A"
        most_common_pair_cnt = top_pairs[0]["count"] if top_pairs else 0

        explanation = (
            f"Analyzed {len(records)} records. The digit pair that appears together "
            f"most frequently is ({most_common_pair}) with {most_common_pair_cnt} occurrences."
        )

        return result_data, explanation

    def _calculate_triplets(
        self,
        records: Sequence[NumberRecord],
    ) -> tuple[dict[str, Any], str]:
        """Find the most common triplets of digits appearing together in numbers."""
        triplets = []

        for r in records:
            digits = sorted([c for c in r.number if c.isdigit()])
            for t in itertools.combinations(set(digits), 3):
                triplets.append(f"{t[0]},{t[1]},{t[2]}")

        triplet_counts = Counter(triplets)
        top_triplets = [{"triplet": t, "count": c} for t, c in triplet_counts.most_common(10)]

        result_data = {
            "total_records_analyzed": len(records),
            "top_digit_triplets": top_triplets,
        }

        most_common_trip = top_triplets[0]["triplet"] if top_triplets else "N/A"
        most_common_trip_cnt = top_triplets[0]["count"] if top_triplets else 0

        explanation = (
            f"Analyzed {len(records)} records. The digit triplet that appears together "
            f"most frequently is ({most_common_trip}) with {most_common_trip_cnt} occurrences."
        )

        return result_data, explanation

    def _calculate_distribution(
        self,
        records: Sequence[NumberRecord],
    ) -> tuple[dict[str, Any], str]:
        """Calculate high/low and odd/even distribution percentages."""
        total_digits = 0
        odd_count = 0
        even_count = 0
        high_count = 0  # 5-9
        low_count = 0  # 0-4

        for r in records:
            for char in r.number:
                if char.isdigit():
                    val = int(char)
                    total_digits += 1
                    # Odd / Even
                    if val % 2 == 0:
                        even_count += 1
                    else:
                        odd_count += 1
                    # High / Low
                    if val >= 5:
                        high_count += 1
                    else:
                        low_count += 1

        odd_pct = round((odd_count / total_digits) * 100, 2) if total_digits else 0
        even_pct = round((even_count / total_digits) * 100, 2) if total_digits else 0
        high_pct = round((high_count / total_digits) * 100, 2) if total_digits else 0
        low_pct = round((low_count / total_digits) * 100, 2) if total_digits else 0

        result_data = {
            "total_records_analyzed": len(records),
            "total_digits_processed": total_digits,
            "odd_percentage": odd_pct,
            "even_percentage": even_pct,
            "high_percentage": high_pct,
            "low_percentage": low_pct,
        }

        explanation = (
            f"Analyzed {len(records)} records ({total_digits} total digits). "
            f"The digit distribution is {odd_pct}% Odd vs {even_pct}% Even, "
            f"and {high_pct}% High (5-9) vs {low_pct}% Low (0-4)."
        )

        return result_data, explanation

    def _compare_with_lottery(
        self,
        records: Sequence[NumberRecord],
        game_id: uuid.UUID,
    ) -> dict[str, Any]:
        """Compare user records with official lottery draws to find matches."""
        # Fetch official draws (last 1000 draws)
        draws = self._lottery_result_repository.list_by_game(game_id, limit=1000)
        draw_map = {d.draw_date: d for d in draws}

        match_count = 0
        matches = []

        for r in records:
            rec_date = r.recorded_at.date()
            # If we find a draw on the same date, compare numbers
            if rec_date in draw_map:
                draw = draw_map[rec_date]
                matched_prizes = []

                if r.number == draw.first_prize:
                    matched_prizes.append("First Prize")
                if r.number == draw.last2:
                    matched_prizes.append("Last 2 Digits")

                if draw.front3:
                    for f3 in draw.front3.split(","):
                        if r.number == f3.strip():
                            matched_prizes.append("Front 3 Digits")
                if draw.back3:
                    for b3 in draw.back3.split(","):
                        if r.number == b3.strip():
                            matched_prizes.append("Back 3 Digits")

                if matched_prizes:
                    match_count += 1
                    matches.append(
                        {
                            "record_id": r.id,
                            "number": r.number,
                            "draw_date": str(draw.draw_date),
                            "prizes_matched": matched_prizes,
                        }
                    )

        return {
            "total_lottery_draws_compared": len(draws),
            "match_count": match_count,
            "matches": matches,
        }
