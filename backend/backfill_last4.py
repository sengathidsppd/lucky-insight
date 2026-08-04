"""Backfill last4 column for all lottery results in Supabase.

Adds last4 column to the lottery_results table and populates it
by taking the last 4 digits of first_prize for all existing records.
"""

import psycopg2

CONN = "postgresql://postgres.nssovtacnasirgnvuwov:Sengathid%40%235587@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require"


def main():
    conn = psycopg2.connect(CONN)
    cur = conn.cursor()

    # Step 1: Add last4 column if it doesn't exist
    print("Step 1: Adding last4 column...")
    cur.execute("""
        ALTER TABLE lottery_results
        ADD COLUMN IF NOT EXISTS last4 VARCHAR(10);
    """)
    conn.commit()
    print("  ✅ last4 column added (or already exists)")

    # Step 2: Backfill last4 from first_prize (last 4 digits)
    print("Step 2: Backfilling last4 from first_prize...")
    cur.execute("""
        UPDATE lottery_results
        SET last4 = RIGHT(
            regexp_replace(first_prize, '[^0-9]', '', 'g'),
            4
        )
        WHERE last4 IS NULL
          AND first_prize IS NOT NULL
          AND LENGTH(regexp_replace(first_prize, '[^0-9]', '', 'g')) >= 4;
    """)
    updated = cur.rowcount
    conn.commit()
    print(f"  ✅ Updated {updated} records with last4")

    # Step 3: Verify
    print("Step 3: Verifying...")
    cur.execute("""
        SELECT first_prize, last4, last2, back3
        FROM lottery_results
        ORDER BY draw_date DESC
        LIMIT 10;
    """)
    rows = cur.fetchall()
    print(f"  {'first_prize':<12} {'last4':<8} {'last2':<6} {'back3':<8}")
    print(f"  {'-'*12} {'-'*8} {'-'*6} {'-'*8}")
    for row in rows:
        print(f"  {row[0] or '-':<12} {row[1] or '-':<8} {row[2] or '-':<6} {row[3] or '-':<8}")

    # Count total
    cur.execute("SELECT COUNT(*) FROM lottery_results WHERE last4 IS NOT NULL;")
    total = cur.fetchone()[0]
    print(f"\n  ✅ Total records with last4: {total}")

    cur.close()
    conn.close()
    print("\nDone! ✅")


if __name__ == "__main__":
    main()
