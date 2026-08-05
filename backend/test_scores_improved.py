"""Test improved scoring model without overdue distortion."""

import psycopg2
from collections import Counter

CONN = "postgresql://postgres.nssovtacnasirgnvuwov:Sengathid%40%235587@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require"

def main():
    conn = psycopg2.connect(CONN)
    cur = conn.cursor()
    cur.execute("""
        SELECT first_prize
        FROM lottery_results
        WHERE deleted_at IS NULL AND first_prize IS NOT NULL
        ORDER BY draw_date DESC;
    """)
    rows = cur.fetchall()

    first_prizes = ["".join([c for c in r[0] if c.isdigit()]) for r in rows if r[0]]
    first_prizes = [fp for fp in first_prizes if len(fp) == 6]

    print(f"Total valid 6D first_prize records: {len(first_prizes)}")

    position_counts = [Counter() for _ in range(6)]
    all_digits = []
    for fp in first_prizes:
        for pos, char in enumerate(fp):
            all_digits.append(char)
            position_counts[pos][char] += 1

    pos_freq_data = []
    for pos in range(6):
        pos_total = sum(position_counts[pos].values()) or 1
        pos_freq_data.append(
            {str(d): round(position_counts[pos][str(d)] / pos_total, 4) for d in range(10)}
        )

    # Overdue Recovery Index (capped at 1.5x max boost)
    digit_gaps = {str(d): [] for d in range(10)}
    digit_last_seen = {str(d): -1 for d in range(10)}
    for idx, fp in enumerate(first_prizes):
        for char in fp:
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
            raw_ratio = curr_gap / avg_gap if avg_gap > 0 else 1.0
            recovery_indices[d_str] = round(min(1.5, raw_ratio), 4)
        else:
            recovery_indices[d_str] = 1.0

    def score_number(num_str: str):
        pos_score = sum(pos_freq_data[i].get(char, 0) for i, char in enumerate(num_str)) / 6
        pos_score_norm = min(100.0, pos_score * 350.0)

        gap_score = sum(recovery_indices.get(char, 1.0) for char in num_str) / 6
        gap_score_norm = min(100.0, gap_score * 40.0)

        odds = sum(1 for c in num_str if int(c) % 2 != 0)
        highs = sum(1 for c in num_str if int(c) >= 5)
        dist_score = 100.0 - (abs(odds - 3) * 15.0) - (abs(highs - 3) * 15.0)

        # Repetition penalty (penalty for 3+ identical digits)
        digit_counts = Counter(num_str)
        max_rep = max(digit_counts.values()) if digit_counts else 1
        rep_penalty = 15.0 if max_rep >= 4 else (8.0 if max_rep == 3 else 0.0)

        weighted_total = (0.4 * pos_score_norm) + (0.3 * gap_score_norm) + (0.3 * dist_score) - rep_penalty
        return round(weighted_total, 2)

    print("\nScoring test numbers with improved model:")
    test_nums = ["005990", "437886", "111680", "932479", "323290", "740702", "081480", "950480", "804970", "382561"]
    for tn in test_nums:
        print(f"  Number {tn}: score = {score_number(tn)}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
