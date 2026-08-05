"""Inspect all users in Supabase DB using psycopg2 directly."""

import psycopg2

CONN = "postgresql://postgres.nssovtacnasirgnvuwov:Sengathid%40%235587@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require"

def main():
    conn = psycopg2.connect(CONN)
    cur = conn.cursor()
    cur.execute("SELECT id, email, is_admin FROM users;")
    rows = cur.fetchall()
    print("Users in Supabase DB:")
    for r in rows:
        print(f"  ID: {r[0]} | Email: {r[1]} | Admin: {r[2]}")
    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
