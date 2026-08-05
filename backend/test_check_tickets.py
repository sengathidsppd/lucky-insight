"""Inspect tickets and lottery results in DB to test auto-check logic."""

import psycopg2

CONN = "postgresql://postgres.nssovtacnasirgnvuwov:Sengathid%40%235587@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require"

def main():
    conn = psycopg2.connect(CONN)
    cur = conn.cursor()

    print("--- User Tickets ---")
    cur.execute("SELECT id, user_id, draw_date, lottery_type, number_code, category, status, amount_spent, prize_won FROM user_tickets;")
    tickets = cur.fetchall()
    for t in tickets:
        print(f"Ticket ID: {t[0]} | Date: {t[2]} | Type: {t[3]} | Code: {t[4]} | Status: {t[6]}")

    print("\n--- Lottery Results ---")
    cur.execute("SELECT r.id, g.code, r.draw_date, r.first_prize, r.last4, r.back3, r.last2 FROM lottery_results r JOIN lottery_games g ON r.game_id = g.id;")
    results = cur.fetchall()
    for r in results:
        print(f"Result ID: {r[0]} | Game: {r[1]} | Date: {r[2]} | 1st: {r[3]} | Last4: {r[4]} | Back3: {r[5]} | Last2: {r[6]}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
