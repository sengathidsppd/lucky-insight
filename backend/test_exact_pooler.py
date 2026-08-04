import psycopg

urls = [
    "postgresql://postgres.nssovtacnasirgnvuwov:Sengathid%40%235587@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require",
    "postgresql://postgres.nssovtacnasirgnvuwov:Sengathid%40%235587@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require",
]

for url in urls:
    try:
        print(f"Testing URL: {url[:75]}...")
        conn = psycopg.connect(url, connect_timeout=10)
        print("CONNECTED SUCCESSFULLY TO SUPABASE IPV4 POOLER!")
        conn.close()
        break
    except Exception as e:
        print(f"FAILED: {e}")
