import psycopg

try:
    conn = psycopg.connect("postgresql://postgres.nssovtacnasirgnvumov:SuZu558769Pass@aws-1-ap-southeast-1-pooler.supabase.com:5432/postgres")
    print("Direct psycopg connection SUCCESSFUL!")
    conn.close()
except Exception as e:
    print(f"Direct psycopg connection FAILED: {e}")

try:
    from app.core.database import engine
    from sqlalchemy import text
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        print("SQLAlchemy engine connection SUCCESSFUL!")
except Exception as e:
    print(f"SQLAlchemy engine connection FAILED: {e}")
