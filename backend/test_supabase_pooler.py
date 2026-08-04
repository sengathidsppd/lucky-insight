import psycopg

# Test direct vs pooler URLs for Supabase
urls = [
    ("Session Pooler (port 5432)", "postgresql://postgres.nssovtacnasirgnvumov:SuZu558769Pass@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require"),
    ("Transaction Pooler (port 6543)", "postgresql://postgres.nssovtacnasirgnvumov:SuZu558769Pass@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require"),
    ("Direct DB (port 5432)", "postgresql://postgres:SuZu558769Pass@db.nssovtacnasirgnvumov.supabase.co:5432/postgres?sslmode=require")
]

for name, url in urls:
    try:
        print(f"Testing {name}...")
        conn = psycopg.connect(url, connect_timeout=5)
        print(f"SUCCESS connecting with {name}!")
        conn.close()
    except Exception as e:
        print(f"FAILED {name}: {e}")
