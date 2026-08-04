import psycopg
from collections import Counter

url = "postgresql://postgres.nssovtacnasirgnvuwov:Sengathid%40%235587@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require"

try:
    print("Testing 2D scoring logic directly on Supabase Lao data...")
    conn = psycopg.connect(url)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT last2 FROM lottery_results 
        WHERE game_id = (SELECT id FROM lottery_games WHERE code = 'LAO') 
          AND last2 IS NOT NULL 
          AND deleted_at IS NULL
    """)
    rows = cursor.fetchall()
    last2_list = [r[0].strip() for r in rows if r[0] and r[0].strip()]
    
    print(f"Total 2-digit draws fetched for LAO: {len(last2_list)}")
    print("Top 10 Most Frequent 2D Numbers in Lao Database:")
    counts = Counter(last2_list).most_common(10)
    for num, count in counts:
        print(f"  - 2D Number '{num}': {count} occurrences")

    cursor.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
