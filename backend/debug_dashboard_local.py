"""Run dashboard service locally to catch exact traceback."""

import uuid
import traceback
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.models.user import User
from app.api.v1.dashboard import get_summary, DashboardService
from app.repositories.analysis_repository import AnalysisRepository
from app.repositories.number_record_repository import NumberRecordRepository

def main():
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        target_id = uuid.UUID("f2669dbd-e71c-4ece-9830-8bb28bd9af35")
        user = db.query(User).filter(User.id == target_id).first()
        print("Testing with user:", user.email, user.id)
        service = DashboardService(db, NumberRecordRepository(db), AnalysisRepository(db))
        res = get_summary(current_user=user, db=db, service=service)
        print("Success for user:", user.email)

    except Exception as e:
        print("CRITICAL ERROR IN DASHBOARD SUMMARY:")
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()
