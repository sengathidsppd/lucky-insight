"""Step-by-step test of dashboard service logic on live DB."""

import traceback
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.models.user import User
from app.models.number_record import NumberRecord
from app.models.analysis_job import AnalysisJob
from app.repositories.analysis_repository import AnalysisRepository
from app.repositories.number_record_repository import NumberRecordRepository
from app.api.v1.analysis import map_job_to_response
from app.api.v1.records import map_record_to_response
from app.services.dashboard_service import DashboardService

def main():
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        user = db.query(User).first()
        print("Testing with User:", user.email, user.id)

        service = DashboardService(db, NumberRecordRepository(db), AnalysisRepository(db))
        
        print("Step 1: getting summary_data...")
        summary_data = service.get_summary(user.id)
        print("Step 1 OK.")

        print("Step 2: mapping recent_records...")
        recent_recs = [map_record_to_response(r) for r in summary_data.recent_records]
        print("Step 2 OK. Count:", len(recent_recs))

        print("Step 3: mapping recent_analysis_jobs...")
        for j in summary_data.recent_analysis_jobs:
            print("Mapping job:", j.id, j.analysis_type, j.parameters)
            mapped = map_job_to_response(j, db)
            print("Mapped OK:", mapped.id, mapped.game_code)

        print("Step 3 ALL OK!")

    except Exception as e:
        print("CRITICAL STEP ERROR:")
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()
