import psycopg

url = "postgresql://postgres.nssovtacnasirgnvuwov:Sengathid%40%235587@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require"

try:
    print("Backfilling last2 and back3 for Lao lottery records in Supabase...")
    conn = psycopg.connect(url)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT r.id, r.first_prize, r.last2, r.back3 
        FROM lottery_results r
        JOIN lottery_games g ON r.game_id = g.id
        WHERE g.code = 'LAO' AND r.deleted_at IS NULL
    """)
    rows = cursor.fetchall()

    updated_count = 0
    for r in rows:
        r_id, p1, l2, b3 = r
        if p1 and len(p1.strip()) >= 6:
            cleaned = p1.strip()
            calc_last2 = cleaned[-2:]
            calc_back3 = cleaned[-3:]

            if not l2 or not b3:
                cursor.execute("""
                    UPDATE lottery_results 
                    SET last2 = COALESCE(last2, %s),
                        back3 = COALESCE(back3, %s)
                    WHERE id = %s
                """, (calc_last2, calc_back3, r_id))
                updated_count += 1

    conn.commit()
    print(f"\n[SUCCESS] Updated {updated_count} Lao lottery records in Supabase database!")

    cursor.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
