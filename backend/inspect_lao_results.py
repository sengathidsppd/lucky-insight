import psycopg

url = "postgresql://postgres.nssovtacnasirgnvuwov:Sengathid%40%235587@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require"

try:
    print("Inspecting Lao Development Lottery Results in Supabase...")
    conn = psycopg.connect(url)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT r.id, r.draw_date, r.draw_number, r.first_prize, r.last2, r.front3, r.back3 
        FROM lottery_results r
        JOIN lottery_games g ON r.game_id = g.id
        WHERE g.code = 'LAO' AND r.deleted_at IS NULL
        ORDER BY r.draw_date DESC
        LIMIT 15
    """)
    rows = cursor.fetchall()
    print(f"\nFetched {len(rows)} Lao Draw Results:")
    for r in rows:
        r_id, date, draw_num, p1, l2, f3, b3 = r
        print(f"  Date: {date} | Draw#: {draw_num} | 1st Prize: {p1} | last2: {l2} | front3: {f3} | back3: {b3}")

    cursor.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
