"""Check lottery_games names in Supabase to clean any Thai text."""

import psycopg2

CONN = "postgresql://postgres.nssovtacnasirgnvuwov:Sengathid%40%235587@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require"

def main():
    conn = psycopg2.connect(CONN)
    cur = conn.cursor()
    cur.execute("SELECT id, code, name FROM lottery_games;")
    rows = cur.fetchall()

    print("Current lottery_games in DB:")
    for r in rows:
        print(f"  ID: {r[0]}, Code: {r[1]}, Name: {r[2]}")

    # Update any names containing Thai characters
    cur.execute("UPDATE lottery_games SET name = 'Lao Development Lottery' WHERE code = 'LAO';")
    cur.execute("UPDATE lottery_games SET name = 'Thai National Lottery' WHERE code = 'THAI';")
    conn.commit()

    cur.execute("SELECT id, code, name FROM lottery_games;")
    updated_rows = cur.fetchall()
    print("\nUpdated lottery_games in DB:")
    for r in updated_rows:
        print(f"  ID: {r[0]}, Code: {r[1]}, Name: {r[2]}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
