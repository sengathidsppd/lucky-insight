"""Run auto_check_pending_tickets on live Supabase DB for user suzu@gmail.com."""

import uuid
import psycopg2

CONN = "postgresql://postgres.nssovtacnasirgnvuwov:Sengathid%40%235587@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require"

def check_ticket(number_code, first_prize, last4=None, back3=None, last2=None, front3=None):
    first_prize = first_prize.strip() if first_prize else ""
    last4 = last4.strip() if last4 else (first_prize[-4:] if len(first_prize) >= 4 else "")
    back3 = back3.strip() if back3 else (first_prize[-3:] if len(first_prize) >= 3 else "")
    last2 = last2.strip() if last2 else (first_prize[-2:] if len(first_prize) >= 2 else "")
    front3 = front3.strip() if front3 else (first_prize[:3] if len(first_prize) >= 3 else "")

    raw_numbers = [n.strip() for n in number_code.replace(" ", "").split(",") if n.strip()]

    for num in raw_numbers:
        length = len(num)
        if length == 6 and num == first_prize:
            return "WON"
        elif length == 4 and (num == last4 or num == first_prize[-4:]):
            return "WON"
        elif length == 3 and (num == back3 or num == front3 or num == first_prize[-3:]):
            return "WON"
        elif length == 2 and (num == last2 or num == first_prize[-2:]):
            return "WON"

    return "MISSED"

def main():
    conn = psycopg2.connect(CONN)
    cur = conn.cursor()

    cur.execute("""
        SELECT ut.id, ut.draw_date, ut.lottery_type, ut.number_code
        FROM user_tickets ut
        WHERE ut.status = 'PENDING';
    """)
    pending = cur.fetchall()
    print(f"Found {len(pending)} PENDING tickets to evaluate:")
    for t in pending:
        t_id, draw_date, l_type, code = t

        cur.execute("""
            SELECT r.first_prize, r.last4, r.back3, r.last2, r.front3
            FROM lottery_results r
            JOIN lottery_games g ON r.game_id = g.id
            WHERE UPPER(g.code) = %s AND r.draw_date = %s;
        """, (l_type.upper(), draw_date))
        result = cur.fetchone()
        if result:
            first_prize, last4, back3, last2, front3 = result
            new_status = check_ticket(code, first_prize, last4, back3, last2, front3)
            print(f"Updating Ticket {t_id} -> {new_status}")
            cur.execute("UPDATE user_tickets SET status = %s WHERE id = %s;", (new_status, t_id))
        else:
            print(f"No draw result found yet for date {draw_date}")

    conn.commit()
    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
