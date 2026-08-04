import psycopg

url = "postgresql://postgres.nssovtacnasirgnvuwov:Sengathid%40%235587@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require"

try:
    print("Connecting to Supabase...")
    conn = psycopg.connect(url)
    cursor = conn.cursor()

    # Delete results for Thai Government Lottery first
    cursor.execute("""
        DELETE FROM lottery_results 
        WHERE game_id IN (
            SELECT id FROM lottery_games WHERE name LIKE '%Thai Government Lottery%'
        )
    """)

    # Delete Thai Government Lottery game
    cursor.execute("""
        DELETE FROM lottery_games 
        WHERE name LIKE '%Thai Government Lottery%'
    """)

    conn.commit()

    # List remaining games
    cursor.execute("SELECT id, code, name FROM lottery_games")
    games = cursor.fetchall()
    print("\nREMAINING GAMES IN SUPABASE DATABASE:")
    for g in games:
        print(f" - ID: {g[0]} | Code: {g[1]} | Name: {g[2]}")

    cursor.close()
    conn.close()
except Exception as e:
    print(f"FAILED: {e}")
