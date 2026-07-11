import uuid
from datetime import date
from app.core.database import SessionLocal
from app.models.user import User
from app.models.lottery_game import LotteryGame
from app.models.lottery_result import LotteryResult

def seed():
    db = SessionLocal()
    try:
        # 1. Update user to Admin
        user = db.query(User).filter(User.email == "suzusengathid@gmail.com").first()
        if user:
            user.is_admin = True
            print(f"Updated user {user.email} to Admin!")
        else:
            print("User suzusengathid@gmail.com not found. Will skip admin promotion.")

        # 2. Find or create games
        thai_game = db.query(LotteryGame).filter(LotteryGame.code == "THAI").first()
        if not thai_game:
            thai_game = LotteryGame(
                name="Thai Government Lottery",
                code="THAI",
                description="Official lottery draws from the Government Lottery Office of Thailand."
            )
            db.add(thai_game)
            db.flush()
            print("Created Thai Government Lottery game.")

        lao_game = db.query(LotteryGame).filter(LotteryGame.code == "LAO").first()
        if not lao_game:
            lao_game = LotteryGame(
                name="Lao Development Lottery",
                code="LAO",
                description="Official Lao lottery draw results (หวยพัฒนา)."
            )
            db.add(lao_game)
            db.flush()
            print("Created Lao Development Lottery game.")

        # 3. Clear existing results for clean seed
        db.query(LotteryResult).filter(LotteryResult.game_id.in_([thai_game.id, lao_game.id])).delete(synchronize_session=False)
        db.flush()

        # 4. Insert Thai results
        thai_results = [
            LotteryResult(
                game_id=thai_game.id,
                draw_date=date(2026, 7, 1),
                draw_number="Draw 25",
                first_prize="554988",
                last2="88",
                front3="412,683",
                back3="254,193"
            ),
            LotteryResult(
                game_id=thai_game.id,
                draw_date=date(2026, 6, 16),
                draw_number="Draw 24",
                first_prize="925608",
                last2="08",
                front3="561,123",
                back3="824,930"
            ),
        ]
        db.add_all(thai_results)

        # 5. Insert Lao results
        lao_results = [
            LotteryResult(
                game_id=lao_game.id,
                draw_date=date(2026, 7, 10),
                draw_number="Lao Draw 52",
                first_prize="000277",
                last2="77",
                front3="000",
                back3="277"
            ),
        ]
        db.add_all(lao_results)
        
        db.commit()
        print("Successfully seeded lottery results for Thai and Lao!")
    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
