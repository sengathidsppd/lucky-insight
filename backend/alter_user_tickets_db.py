"""Alter user_tickets number_code column to VARCHAR(255) in Supabase."""

import psycopg2

CONN = "postgresql://postgres.nssovtacnasirgnvuwov:Sengathid%40%235587@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require"

def main():
    conn = psycopg2.connect(CONN)
    cur = conn.cursor()
    cur.execute("ALTER TABLE user_tickets ALTER COLUMN number_code TYPE VARCHAR(255);")
    conn.commit()
    print("Successfully altered user_tickets.number_code column to VARCHAR(255) in Supabase DB!")
    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
