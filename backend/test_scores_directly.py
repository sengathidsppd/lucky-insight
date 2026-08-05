"""Run analysis service logic directly to see top 10 6D numbers and their scores."""

import psycopg2
from collections import Counter
from types import SimpleNamespace

CONN = "postgresql://postgres.nssovtacnasirgnvuwov:Sengathid%40%235587@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require"

def main():
    conn = psycopg2.connect(CONN)
    cur = conn.cursor()
    cur.execute("""
        SELECT first_prize, last2, last4, back3, front3
        FROM lottery_results
        WHERE deleted_at IS NULL
        ORDER BY draw_date DESC;
    """)
    rows = cur.fetchall()

    combined_records = []
    for r in rows:
        if r[0]:
            combined_records.append(SimpleNamespace(number=r[0]))
        if r[1]:
            combined_records.append(SimpleNamespace(number=r[1]))
        if r[2]:
            combined_records.append(SimpleNamespace(number=r[2]))
        if r[3]:
            combined_records.append(SimpleNamespace(number=r[3]))
        if r[4]:
            combined_records.append(SimpleNamespace(number=r[4]))

    records = combined_records
    total_records = len(records)
    all_digits = []
    endings_map = {length: [] for length in range(1, 7)}
    position_counts = [Counter() for _ in range(6)]

    for r in records:
        num_str = r.number.strip()
        cleaned_num = "".join([c for c in num_str if c.isdigit()])

        num_len = len(cleaned_num)
        start_pos = 6 - num_len if num_len <= 6 else 0

        for i, char in enumerate(cleaned_num):
            all_digits.append(char)
            target_pos = start_pos + i
            if 0 <= target_pos < 6:
                position_counts[target_pos][char] += 1

        for length in range(1, 7):
            if len(cleaned_num) >= length:
                endings_map[length].append(cleaned_num[-length:])

    pos_freq_data = []
    for pos in range(6):
        pos_total = sum(position_counts[pos].values()) or 1
        pos_freq_data.append(
            {str(d): round(position_counts[pos][str(d)] / pos_total, 4) for d in range(10)}
        )

    print("Position frequencies (top digit per position):")
    for p in range(6):
        top_d = sorted(pos_freq_data[p].items(), key=lambda x: x[1], reverse=True)[:3]
        print(f"  Pos {p}: {top_d}")

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

    print("\nRecovery indices (overdue factor):")
    for d in range(10):
        print(f"  Digit {d}: {recovery_indices[str(d)]}")

    def score_number(num_str: str):
        pos_score = sum(pos_freq_data[i].get(char, 0) for i, char in enumerate(num_str)) / 6
        pos_score_norm = min(100.0, pos_score * 300.0)

        gap_score = sum(recovery_indices.get(char, 1.0) for char in num_str) / 6
        gap_score_norm = min(100.0, gap_score * 50.0)

        odds = sum(1 for c in num_str if int(c) % 2 != 0)
        highs = sum(1 for c in num_str if int(c) >= 5)
        dist_score = 100.0 - (abs(odds - 3) * 15.0) - (abs(highs - 3) * 15.0)

        weighted_total = (0.4 * pos_score_norm) + (0.3 * gap_score_norm) + (0.3 * dist_score)
        return round(weighted_total, 2)

    # Score some test numbers
    print("\nScoring test numbers:")
    test_nums = ["005990", "005999", "123456", "987654", "096592", "889900"]
    for tn in test_nums:
        print(f"  Number {tn}: score = {score_number(tn)}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
