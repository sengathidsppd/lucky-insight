from app.core.database import SessionLocal
from app.models.user import User
from app.security.password import hash_password

db = SessionLocal()
user = db.query(User).filter_by(email="suzu@gmail.com").first()
if not user:
    new_user = User(
        email="suzu@gmail.com",
        hashed_password=hash_password("12345678"),
        full_name="Suzu User",
        is_active=True,
        is_admin=True,
    )
    db.add(new_user)
    db.commit()
    print("User suzu@gmail.com created successfully!")
else:
    print("User suzu@gmail.com already exists!")
db.close()
