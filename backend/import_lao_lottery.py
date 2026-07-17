import re
from datetime import datetime
from app.core.database import SessionLocal
from app.models.lottery_game import LotteryGame
from app.models.lottery_result import LotteryResult

def parse_and_import():
    db = SessionLocal()
    try:
        lao_game = db.query(LotteryGame).filter(LotteryGame.code == 'LAO').first()
        if not lao_game:
            print("LAO game not found in DB!")
            return

        with open('lao_raw.txt', 'r', encoding='utf-8') as f:
            content = f.read()

        # Split by blocks that start with the draw number "ງວດທີ"
        # Since the text format is like:
        # ງວດທີ 111
        # ຄັ້ງວັນທີ 17/07/2026
        # ເລກ 6 ໂຕ
        # 364604
        
        # Regex to find each block
        pattern = re.compile(r'ງວດທີ\s+(\d+)\s+ຄັ້ງວັນທີ\s+(\d{2}/\d{2}/\d{4})\s+ເລກ 6 ໂຕ\s+(\d{6})', re.MULTILINE)
        matches = pattern.findall(content)
        
        imported_count = 0
        skipped_count = 0

        for match in matches:
            draw_number = match[0]
            date_str = match[1]
            first_prize = match[2]
            
            draw_date = datetime.strptime(date_str, "%d/%m/%Y").date()
            last2 = first_prize[-2:]
            back3 = first_prize[-3:]
            
            # Check if exists
            exists = db.query(LotteryResult).filter(
                LotteryResult.game_id == lao_game.id,
                LotteryResult.draw_date == draw_date
            ).first()
            
            if not exists:
                r = LotteryResult(
                    game_id=lao_game.id,
                    draw_date=draw_date,
                    draw_number=draw_number,
                    first_prize=first_prize,
                    last2=last2,
                    back3=back3,
                    front3=None
                )
                db.add(r)
                imported_count += 1
            else:
                skipped_count += 1

        db.commit()
        print(f"Import complete! Added {imported_count} draws. Skipped {skipped_count} existing draws.")

    except Exception as e:
        db.rollback()
        print(f"Error during import: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    parse_and_import()
