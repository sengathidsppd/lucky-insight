import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Direct Supabase hostname
urls = [
    "postgresql+psycopg://postgres:SuZu558769Pass@db.nssovtacnasirgnvumov.supabase.co:5432/postgres?sslmode=require",
    "postgresql+psycopg://postgres.nssovtacnasirgnvumov:SuZu558769Pass@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require",
    "postgresql+psycopg://postgres.nssovtacnasirgnvumov:SuZu558769Pass@aws-1-ap-southeast-1-pooler.supabase.com:5432/postgres?sslmode=require"
]

for url in urls:
    try:
        print(f"Trying connection: {url[:50]}...")
        engine = create_engine(url, connect_args={"connect_timeout": 10})
        
        from app.models.base import Base
        from app.models.user import User
        from app.security.password import hash_password
        import app.models  # noqa: F401
        
        Base.metadata.create_all(bind=engine)
        
        SessionLocal = sessionmaker(bind=engine)
        db = SessionLocal()
        
        user = db.query(User).filter_by(email="suzu@gmail.com").first()
        if not user:
            new_user = User(
                email="suzu@gmail.com",
                hashed_password=hash_password("12345678"),
                full_name="Suzu Admin",
                is_active=True,
                is_admin=True,
            )
            db.add(new_user)
            db.commit()
            print("User suzu@gmail.com seeded successfully!")
        else:
            user.hashed_password = hash_password("12345678")
            user.is_active = True
            db.commit()
            print("User suzu@gmail.com password updated to 12345678!")
            
        db.close()
        break
    except Exception as e:
        print(f"Failed with error: {e}")
