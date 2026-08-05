"""Run dashboard summary on Supabase DB for user f2669dbd-e71c-4ece-9830-8bb28bd9af35."""

import uuid
import traceback
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.user import User
from app.api.v1.dashboard import get_summary, DashboardService
from app.repositories.analysis_repository import AnalysisRepository
from app.repositories.number_record_repository import NumberRecordRepository

CONN = "postgresql+psycopg2://postgres.nssovtacnasirgnvuwov:Sengathid%40%235587@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require"

def main():
    engine = create_engine(CONN)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        user_id = uuid.UUID("f2669dbd-e71c-4ece-9830-8bb28bd9af35")
        user = db.query(User).filter(User.id == user_id).first()
        print("Testing with Supabase user:", user.email, user.id)

        service = DashboardService(db, NumberRecordRepository(db), AnalysisRepository(db))
        res = get_summary(current_user=user, db=db, service=service)
        print("SUCCESS! Dashboard Summary Data:", res)

    except Exception as e:
        print("CRITICAL ERROR ON SUPABASE DB:")
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()
