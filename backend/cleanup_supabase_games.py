import psycopg

url = "postgresql://postgres.nssovtacnasirgnvuwov:Sengathid%40%235587@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require"

try:
    print("Connecting to Supabase to clean duplicate seeded games...")
    conn = psycopg.connect(url)
    cursor = conn.cursor()

    # Delete results associated with seeded games
    cursor.execute("""
        DELETE FROM lottery_results 
        WHERE game_id IN (
            SELECT id FROM lottery_games WHERE code IN ('THAI_GOV', 'LAO_DEV') OR name LIKE '%(หวย%'
        )
    """)

    # Delete seeded games
    cursor.execute("""
        DELETE FROM lottery_games 
        WHERE code IN ('THAI_GOV', 'LAO_DEV') OR name LIKE '%(หวย%'
    """)

    conn.commit()
    print("SUCCESSFULLY DELETED DUPLICATE SEEDED GAMES AND RESULTS FROM SUPABASE!")
    cursor.close()
    conn.close()
except Exception as e:
    print(f"FAILED to cleanup Supabase games: {e}")
