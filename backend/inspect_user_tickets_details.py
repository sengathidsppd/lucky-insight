"""Inspect all user tickets for suzu@gmail.com."""

import psycopg2
import json

CONN = "postgresql://postgres.nssovtacnasirgnvuwov:Sengathid%40%235587@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require"

def main():
    conn = psycopg2.connect(CONN)
    cur = conn.cursor()
    cur.execute("""
        SELECT ut.id, u.email, ut.draw_date, ut.lottery_type, ut.number_code, ut.category, ut.status, ut.amount_spent, ut.prize_won
        FROM user_tickets ut
        JOIN users u ON ut.user_id = u.id;
    """)
    rows = cur.fetchall()
    print("User Tickets:")
    for r in rows:
        print(f"User: {r[1]} | Ticket ID: {r[0]} | Date: {r[2]} | Type: {r[3]} | Code: {r[4]} | Category: {r[5]} | Status: {r[6]} | Spent: {r[7]} | Won: {r[8]}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
