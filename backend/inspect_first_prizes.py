"""Inspect why 005990 gets highest score in analysis service."""

import psycopg2
from collections import Counter

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

    print(f"Total lottery_results rows: {len(rows)}")

    # Inspect first 10 rows
    print("\nFirst 10 records:")
    for r in rows[:10]:
        print(f"  1st: {r[0]}, last2: {r[1]}, last4: {r[2]}, back3: {r[3]}, front3: {r[4]}")

    # Inspect unique first_prize values
    first_prizes = [r[0] for r in rows if r[0]]
    print(f"\nTotal first_prize records: {len(first_prizes)}")
    print(f"Most common first_prizes: {Counter(first_prizes).most_common(10)}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
