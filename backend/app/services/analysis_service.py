"""Statistical analysis service layer."""

import itertools
import math
import uuid
from collections import Counter
from collections.abc import Sequence
from datetime import datetime
from typing import Any

from app.core.logging import get_logger
from app.models.analysis_job import AnalysisJob
from app.models.analysis_result import AnalysisResult
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
        # Create RUNNING job
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

            if date_from_str:
                dt_from = datetime.fromisoformat(date_from_str.replace("Z", "+00:00")).replace(
                    hour=0, minute=0, second=0, microsecond=0
                )
            else:
                dt_from = None

            if date_to_str:
                dt_to = datetime.fromisoformat(date_to_str.replace("Z", "+00:00")).replace(
                    hour=23, minute=59, second=59, microsecond=999999
                )
            else:
                dt_to = None

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

            # If game_id is provided, also fetch official draw results and merge them
            if game_id:
                from sqlalchemy import select

                from app.models.lottery_result import LotteryResult

                stmt = (
                    select(LotteryResult)
                    .where(LotteryResult.game_id == game_id)
                    .where(LotteryResult.deleted_at.is_(None))
                )
                stmt = stmt.order_by(LotteryResult.draw_date.desc()).limit(100)

                results = self._lottery_result_repository._session.execute(stmt).scalars().all()
                combined_records.extend([SimpleNamespace(number=r.first_prize) for r in results])

            if not combined_records:
                raise ValueError(
                    "No records or official draw results found matching the specified filters."
                )

            # Perform calculation based on type
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
            elif job.analysis_type == "TREND":
                result_data, explanation = self._calculate_trends(combined_records)
            else:
                raise ValueError(f"Unsupported analysis type: {analysis_type}")

            # Optional comparison with official lottery draw results
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
        records: Sequence[Any],
    ) -> tuple[dict[str, Any], str]:
        """Calculate relative and position-specific digit frequencies and score recommendations."""
        total_records = len(records)
        all_digits = []
        endings_map = {length: [] for length in range(1, 7)}
        position_counts = [Counter() for _ in range(6)]

        for r in records:
            num_str = r.number.strip()
            cleaned_num = "".join([c for c in num_str if c.isdigit()])

            # Position-specific & Single frequencies
            for pos, char in enumerate(cleaned_num):
                all_digits.append(char)
                if pos < 6:
                    position_counts[pos][char] += 1

            # Endings
            for length in range(1, 7):
                if len(cleaned_num) >= length:
                    endings_map[length].append(cleaned_num[-length:])

        digit_counts = Counter(all_digits)
        total_digit_instances = len(all_digits) or 1

        # Calculate Relative Frequencies
        top_digits = [
            {"digit": d, "count": c, "relative_frequency": round(c / total_digit_instances, 4)}
            for d, c in digit_counts.most_common(10)
        ]

        # Calculate position-specific relative frequencies
        pos_freq_data = []
        for pos in range(6):
            pos_total = sum(position_counts[pos].values()) or 1
            pos_freq_data.append(
                {str(d): round(position_counts[pos][str(d)] / pos_total, 4) for d in range(10)}
            )

        # Overdue Recovery Index Helper for Scoring
        digit_gaps = {str(d): [] for d in range(10)}
        digit_last_seen = {str(d): -1 for d in range(10)}
        for idx, r in enumerate(records):
            num_str = "".join([c for c in r.number if c.isdigit()])
            for char in num_str:
                if char in digit_gaps:
                    if digit_last_seen[char] == -1:
                        digit_gaps[char].append(idx)
                    else:
                        digit_gaps[char].append(idx - digit_last_seen[char])
                    digit_last_seen[char] = idx

        recovery_indices = {}
        for d in range(10):
            d_str = str(d)
            gaps = digit_gaps[d_str]
            if gaps:
                curr_gap = gaps[0]
                avg_gap = sum(gaps) / len(gaps)
                recovery_indices[d_str] = round(curr_gap / avg_gap if avg_gap > 0 else 1.0, 4)
            else:
                recovery_indices[d_str] = 1.0

        # Mathematical Multi-criteria Scoring Model
        def score_number(num_str: str) -> tuple[float, dict[str, Any]]:
            # 1. Position Frequency Component (Weight 40%)
            pos_score = sum(pos_freq_data[i].get(char, 0) for i, char in enumerate(num_str)) / 6
            # Normalize pos_score (maximum possible is 1.0, typical top is ~0.3)
            pos_score_norm = min(100.0, pos_score * 300.0)

            # 2. Recovery / Gaps Overdue Component (Weight 30%)
            gap_score = sum(recovery_indices.get(char, 1.0) for char in num_str) / 6
            # Reward numbers that have overdue digits
            gap_score_norm = min(100.0, gap_score * 50.0)

            # 3. Digit distribution balance (Weight 30%)
            odds = sum(1 for c in num_str if int(c) % 2 != 0)
            highs = sum(1 for c in num_str if int(c) >= 5)
            # Ideal distributions (e.g. 3:3 split) get maximum points
            dist_score = 100.0 - (abs(odds - 3) * 15.0) - (abs(highs - 3) * 15.0)

            weighted_total = (0.4 * pos_score_norm) + (0.3 * gap_score_norm) + (0.3 * dist_score)

            final_score = weighted_total

            audit = {
                "position_frequency": {
                    "raw_score": round(pos_score, 4),
                    "normalized": round(pos_score_norm, 2),
                    "explanation": f"Sum of historical position-specific frequencies is {round(pos_score, 3)}",
                },
                "recovery_index": {
                    "raw_score": round(gap_score, 4),
                    "normalized": round(gap_score_norm, 2),
                    "explanation": f"Average recovery overdue factor is {round(gap_score, 2)}x",
                },
                "balance_distribution": {
                    "normalized": round(dist_score, 2),
                    "explanation": f"Contains {odds} odd and {highs} high digits",
                },
            }
            return round(final_score, 2), audit

        # Score and rank unique 6-digit combinations + random candidates for dynamic results
        unique_6d = set(endings_map[6])
        import random

        random.seed(42)
        # Inject 10,000 random combinations to find high-scoring unseen numbers
        for _ in range(10000):
            unique_6d.add(f"{random.randint(0, 999999):06d}")

        scored_6d = []
        for num in unique_6d:
            sc, aud = score_number(num)
            scored_6d.append({"number": num, "score": sc, "audit": aud})

        scored_6d.sort(key=lambda x: x["score"], reverse=True)

        # Select top 5 mathematically without random sampling
        best_5_6d = scored_6d[:5]

        # Generate exactly 1 smart recommendation (Hot Pick):
        # The absolute top frequency/probability digit for each position slot.
        pick_1 = []
        for pos in range(6):
            candidates = position_counts[pos].most_common(1)
            if candidates:
                pick_1.append(candidates[0][0])
            else:
                pick_1.append("0")
        pick_1_str = "".join(pick_1)

        # Score 3-digit combinations (positions 3, 4, 5 of a 6-digit draw)
        def score_3d(num_str: str) -> float:
            pos_score = (
                pos_freq_data[3].get(num_str[0], 0)
                + pos_freq_data[4].get(num_str[1], 0)
                + pos_freq_data[5].get(num_str[2], 0)
            ) / 3
            pos_score_norm = min(100.0, pos_score * 300.0)

            gap_score = sum(recovery_indices.get(char, 1.0) for char in num_str) / 3
            gap_score_norm = min(100.0, gap_score * 50.0)

            odds = sum(1 for c in num_str if int(c) % 2 != 0)
            highs = sum(1 for c in num_str if int(c) >= 5)
            dist_score = 100.0 - (abs(odds - 1.5) * 20.0) - (abs(highs - 1.5) * 20.0)

            weighted_total = (0.4 * pos_score_norm) + (0.3 * gap_score_norm) + (0.3 * dist_score)

            final_score = weighted_total
            return round(final_score, 2)

        # Score 2-digit combinations (positions 4 and 5 of a 6-digit draw)
        def score_2d(num_str: str) -> float:
            pos_score = (
                pos_freq_data[4].get(num_str[0], 0) + pos_freq_data[5].get(num_str[1], 0)
            ) / 2
            pos_score_norm = min(100.0, pos_score * 300.0)

            gap_score = sum(recovery_indices.get(char, 1.0) for char in num_str) / 2
            gap_score_norm = min(100.0, gap_score * 50.0)

            odds = sum(1 for c in num_str if int(c) % 2 != 0)
            highs = sum(1 for c in num_str if int(c) >= 5)
            dist_score = 100.0 - (abs(odds - 1) * 30.0) - (abs(highs - 1) * 30.0)

            weighted_total = (0.4 * pos_score_norm) + (0.3 * gap_score_norm) + (0.3 * dist_score)

            final_score = weighted_total
            return round(final_score, 2)

        # Score 4-digit combinations (positions 2, 3, 4, 5 of a 6-digit draw)
        def score_4d(num_str: str) -> float:
            pos_score = (
                pos_freq_data[2].get(num_str[0], 0)
                + pos_freq_data[3].get(num_str[1], 0)
                + pos_freq_data[4].get(num_str[2], 0)
                + pos_freq_data[5].get(num_str[3], 0)
            ) / 4
            pos_score_norm = min(100.0, pos_score * 300.0)

            gap_score = sum(recovery_indices.get(char, 1.0) for char in num_str) / 4
            gap_score_norm = min(100.0, gap_score * 50.0)

            odds = sum(1 for c in num_str if int(c) % 2 != 0)
            highs = sum(1 for c in num_str if int(c) >= 5)
            dist_score = 100.0 - (abs(odds - 2) * 20.0) - (abs(highs - 2) * 20.0)

            weighted_total = (0.4 * pos_score_norm) + (0.3 * gap_score_norm) + (0.3 * dist_score)

            final_score = weighted_total
            return round(final_score, 2)

        scored_4d_all = []
        for x in range(10000):
            num_4d = f"{x:04d}"
            scored_4d_all.append({"number": num_4d, "score": score_4d(num_4d)})
        scored_4d_all.sort(key=lambda x: x["score"], reverse=True)
        top_1_4d = scored_4d_all[:1]

        scored_3d_all = []
        for x in range(1000):
            num_3d = f"{x:03d}"
            scored_3d_all.append({"number": num_3d, "score": score_3d(num_3d)})
        scored_3d_all.sort(key=lambda x: x["score"], reverse=True)
        top_1_3d = scored_3d_all[:1]

        scored_2d_all = []
        for x in range(100):
            num_2d = f"{x:02d}"
            scored_2d_all.append({"number": num_2d, "score": score_2d(num_2d)})
        scored_2d_all.sort(key=lambda x: x["score"], reverse=True)
        top_1_2d = scored_2d_all[:1]

        result_data = {
            "total_records_analyzed": total_records,
            "top_single_digits": top_digits,
            "position_frequencies": pos_freq_data,
            "best_analyzed_6d": best_5_6d,
            "generated_recommendations": [pick_1_str],
            "generated_4d_recommendations": top_1_4d,
            "generated_3d_recommendations": top_1_3d,
            "generated_2d_recommendations": top_1_2d,
            "recent_draws": [r.number for r in records[:10]],
        }

        # Add endings of length 1 to 6
        for length in range(1, 7):
            ending_counts = Counter(endings_map[length])
            result_data[f"top_{length}digit_endings"] = [
                {"combination": comb, "count": c} for comb, c in ending_counts.most_common(10)
            ]

        most_freq_digit = top_digits[0]["digit"] if top_digits else "N/A"
        most_freq_digit_pct = (
            round(top_digits[0]["relative_frequency"] * 100, 2) if top_digits else 0
        )
        most_freq_2d = (
            result_data["top_2digit_endings"][0]["combination"]
            if result_data["top_2digit_endings"]
            else "N/A"
        )

        explanation = (
            f"Analyzed {total_records} records. The most frequent single digit is "
            f"'{most_freq_digit}' making up {most_freq_digit_pct}% of all drawn digits. "
            f"The most common 2-digit ending is '{most_freq_2d}'."
        )

        return result_data, explanation

    def _calculate_pairs(
        self,
        records: Sequence[Any],
    ) -> tuple[dict[str, Any], str]:
        """Find the most common pairs of digits appearing together and compute association lifts."""
        pairs = []
        digit_occurrences = Counter()
        mirror_map = {
            "0": "5",
            "1": "6",
            "2": "7",
            "3": "8",
            "4": "9",
            "5": "0",
            "6": "1",
            "7": "2",
            "8": "3",
            "9": "4",
        }
        mirror_counts = Counter()
        reverse_counts = Counter()
        neighbor_matches = 0

        for r in records:
            digits = sorted([c for c in r.number if c.isdigit()])
            unique_digits = sorted(list(set(digits)))

            # Count individual occurrences for Lift
            for d in unique_digits:
                digit_occurrences[d] += 1

            # Unique undirected pairs in the number
            for p in itertools.combinations(unique_digits, 2):
                pairs.append(f"{p[0]},{p[1]}")

                # Check Mirror pairs
                if mirror_map[p[0]] == p[1]:
                    mirror_counts[f"{p[0]},{p[1]}"] += 1

            # Adjacency Neighbor counts
            for i in range(len(digits) - 1):
                if abs(int(digits[i]) - int(digits[i + 1])) == 1:
                    neighbor_matches += 1

            # Reverse pairs (2-digit endings order independence)
            cleaned_num = "".join([c for c in r.number if c.isdigit()])
            if len(cleaned_num) >= 2:
                ending_2d = cleaned_num[-2:]
                rev_ending = ending_2d[::-1]
                sorted_key = f"{min(ending_2d[0], ending_2d[1])},{max(ending_2d[0], ending_2d[1])}"
                reverse_counts[sorted_key] += 1

        total_records = len(records) or 1
        pair_counts = Counter(pairs)

        # Calculate association lift metrics
        top_pairs = []
        for p, count in pair_counts.most_common(10):
            d1, d2 = p.split(",")
            support_ab = count / total_records
            support_a = digit_occurrences[d1] / total_records
            support_b = digit_occurrences[d2] / total_records
            lift = support_ab / (support_a * support_b) if (support_a * support_b) > 0 else 0.0

            top_pairs.append(
                {"pair": p, "count": count, "support": round(support_ab, 4), "lift": round(lift, 4)}
            )

        result_data = {
            "total_records_analyzed": len(records),
            "top_digit_pairs": top_pairs,
            "mirror_pairs": [{"pair": p, "count": c} for p, c in mirror_counts.most_common(5)],
            "reverse_combinations": [
                {"pair": p, "count": c} for p, c in reverse_counts.most_common(5)
            ],
            "neighbor_adjacency_count": neighbor_matches,
        }

        most_common_pair = top_pairs[0]["pair"] if top_pairs else "N/A"
        most_common_pair_cnt = top_pairs[0]["count"] if top_pairs else 0
        most_common_pair_lift = top_pairs[0]["lift"] if top_pairs else 1.0

        explanation = (
            f"Analyzed {len(records)} records. The digit pair that appears together "
            f"most frequently is ({most_common_pair}) with {most_common_pair_cnt} occurrences "
            f"and a correlation Lift factor of {most_common_pair_lift}."
        )

        return result_data, explanation

    def _calculate_triplets(
        self,
        records: Sequence[Any],
    ) -> tuple[dict[str, Any], str]:
        """Find the most common triplets of digits appearing together in numbers with association lifts."""
        triplets = []
        digit_occurrences = Counter()

        for r in records:
            digits = sorted([c for c in r.number if c.isdigit()])
            unique_digits = sorted(list(set(digits)))
            for d in unique_digits:
                digit_occurrences[d] += 1
            for t in itertools.combinations(unique_digits, 3):
                triplets.append(f"{t[0]},{t[1]},{t[2]}")

        total_records = len(records) or 1
        triplet_counts = Counter(triplets)

        top_triplets = []
        for t, count in triplet_counts.most_common(10):
            d1, d2, d3 = t.split(",")
            support_abc = count / total_records
            support_a = digit_occurrences[d1] / total_records
            support_b = digit_occurrences[d2] / total_records
            support_c = digit_occurrences[d3] / total_records

            # Simple Lift calculation for 3 variables
            denominator = support_a * support_b * support_c
            lift = support_abc / denominator if denominator > 0 else 0.0

            top_triplets.append(
                {
                    "triplet": t,
                    "count": count,
                    "support": round(support_abc, 4),
                    "lift": round(lift, 4),
                }
            )

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
        records: Sequence[Any],
    ) -> tuple[dict[str, Any], str]:
        """Calculate high/low and odd/even distributions, variance, Shannon entropy, and Chi-Square goodness-of-fit."""
        total_digits = 0
        odd_count = 0
        even_count = 0
        high_count = 0  # 5-9
        low_count = 0  # 0-4

        draw_entropies = []
        draw_variances = []
        observed_counts = Counter()

        for r in records:
            cleaned_num = [int(c) for c in r.number if c.isdigit()]
            if not cleaned_num:
                continue

            # Variance
            mean = sum(cleaned_num) / len(cleaned_num)
            variance = sum((x - mean) ** 2 for x in cleaned_num) / len(cleaned_num)
            draw_variances.append(variance)

            # Shannon Entropy of the draw sequence
            digit_counts = Counter(cleaned_num)
            entropy = -sum(
                (c / len(cleaned_num)) * math.log2(c / len(cleaned_num))
                for c in digit_counts.values()
            )
            draw_entropies.append(entropy)

            for val in cleaned_num:
                total_digits += 1
                observed_counts[str(val)] += 1
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

        avg_variance = (
            round(sum(draw_variances) / len(draw_variances), 4) if draw_variances else 0.0
        )
        avg_entropy = round(sum(draw_entropies) / len(draw_entropies), 4) if draw_entropies else 0.0

        # Chi-Square Goodness-of-Fit test against uniform distribution (Expected: total_digits / 10)
        expected_count = total_digits / 10 if total_digits else 1
        chi_sq_stat = 0.0
        for d in range(10):
            obs = observed_counts[str(d)]
            chi_sq_stat += ((obs - expected_count) ** 2) / expected_count

        result_data = {
            "total_records_analyzed": len(records),
            "total_digits_processed": total_digits,
            "odd_percentage": odd_pct,
            "even_percentage": even_pct,
            "high_percentage": high_pct,
            "low_percentage": low_pct,
            "average_variance": avg_variance,
            "average_entropy": avg_entropy,
            "chi_square_statistic": round(chi_sq_stat, 4),
        }

        explanation = (
            f"Analyzed {len(records)} records ({total_digits} total digits). "
            f"The digit distribution is {odd_pct}% Odd vs {even_pct}% Even, "
            f"and {high_pct}% High vs {low_pct}% Low. "
            f"The average entropy complexity of numbers is {avg_entropy} and "
            f"the Chi-square deviation factor is {round(chi_sq_stat, 2)}."
        )

        return result_data, explanation

    def _calculate_trends(
        self,
        records: Sequence[Any],
    ) -> tuple[dict[str, Any], str]:
        """Perform Gap Analysis, Rolling Frequency Trends, Transition Matrix, and Markov Chain modeling."""
        total_records = len(records)

        # 1. Gap Analysis
        digit_gaps = {str(d): [] for d in range(10)}
        digit_last_seen = {str(d): -1 for d in range(10)}

        for idx, r in enumerate(records):
            num_str = "".join([c for c in r.number if c.isdigit()])
            for char in num_str:
                if char in digit_gaps:
                    if digit_last_seen[char] == -1:
                        digit_gaps[char].append(idx)
                    else:
                        digit_gaps[char].append(idx - digit_last_seen[char])
                    digit_last_seen[char] = idx

        gap_data = {}
        for d in range(10):
            d_str = str(d)
            gaps = digit_gaps[d_str]
            if gaps:
                curr_gap = gaps[0]
                avg_gap = sum(gaps) / len(gaps)
                gap_data[d_str] = {
                    "current_gap": curr_gap,
                    "average_gap": round(avg_gap, 2),
                    "recovery_index": round(curr_gap / avg_gap if avg_gap > 0 else 1.0, 2),
                }
            else:
                gap_data[d_str] = {
                    "current_gap": total_records,
                    "average_gap": total_records,
                    "recovery_index": 1.0,
                }

        # 2. Rolling Frequency & Momentum (last 50 vs overall)
        recent_limit = min(50, total_records)
        recent_records = records[:recent_limit]
        recent_digits = []
        for r in recent_records:
            recent_digits.extend([c for c in r.number if c.isdigit()])

        recent_counts = Counter(recent_digits)
        recent_total = len(recent_digits) or 1

        overall_digits = []
        for r in records:
            overall_digits.extend([c for c in r.number if c.isdigit()])
        overall_counts = Counter(overall_digits)
        overall_total = len(overall_digits) or 1

        digit_trends = []
        for d in range(10):
            d_str = str(d)
            rec_pct = recent_counts[d_str] / recent_total
            over_pct = overall_counts[d_str] / overall_total
            momentum = rec_pct - over_pct

            digit_trends.append(
                {
                    "digit": d_str,
                    "rolling_frequency": round(rec_pct, 4),
                    "historical_frequency": round(over_pct, 4),
                    "momentum": round(momentum, 4),
                    "status": (
                        "HOT" if momentum > 0.02 else "COLD" if momentum < -0.02 else "NEUTRAL"
                    ),
                }
            )

        # 3. Transition Matrix & First-Order Markov transitions
        transition_matrix = {str(i): {str(j): 0 for j in range(10)} for i in range(10)}
        for t in range(len(records) - 1):
            curr_digits = [int(c) for c in records[t].number if c.isdigit()]
            next_digits = [int(c) for c in records[t + 1].number if c.isdigit()]

            # Track transitions within the same position slot
            limit_pos = min(len(curr_digits), len(next_digits))
            for pos in range(limit_pos):
                d_t = str(curr_digits[pos])
                d_next = str(next_digits[pos])
                if d_t in transition_matrix and d_next in transition_matrix[d_t]:
                    transition_matrix[d_t][d_next] += 1

        # Normalize transition probabilities
        transition_probabilities = {}
        for d_from, transitions in transition_matrix.items():
            total_trans = sum(transitions.values()) or 1
            transition_probabilities[d_from] = {
                d_to: round(count / total_trans, 4) for d_to, count in transitions.items()
            }

        result_data = {
            "total_records_analyzed": total_records,
            "gaps": gap_data,
            "digit_trends": digit_trends,
            "transition_probabilities": transition_probabilities,
        }

        # Find most overdue digit
        most_overdue = max(gap_data.keys(), key=lambda k: gap_data[k]["recovery_index"])
        overdue_idx = gap_data[most_overdue]["recovery_index"]

        explanation = (
            f"Analyzed trends across {total_records} records. The most statistically overdue digit "
            f"is '{most_overdue}' with an Overdue Recovery Index of {overdue_idx}x (current gap exceeds "
            f"historical average gap)."
        )

        return result_data, explanation

    def _compare_with_lottery(
        self,
        records: Sequence[Any],
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
