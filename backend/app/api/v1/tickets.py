import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_active_user
from app.core.database import get_db
from app.models.user import User
from app.models.user_ticket import UserTicket
from app.schemas.ticket import (
    UserTicketCreate,
    UserTicketResponse,
    UserTicketSummary,
    UserTicketUpdate,
)

router = APIRouter()

from app.models.lottery_game import LotteryGame
from app.models.lottery_result import LotteryResult

def auto_check_pending_tickets(db: Session, user_id: Optional[uuid.UUID] = None):
    """Automatically check PENDING tickets against official draw results in lottery_results table."""
    try:
        stmt = select(UserTicket).where(UserTicket.status == "PENDING")
        if user_id:
            stmt = stmt.where(UserTicket.user_id == user_id)
        
        pending_tickets = db.execute(stmt).scalars().all()
        if not pending_tickets:
            return

        for ticket in pending_tickets:
            # Find matching result for game and draw_date
            res_stmt = (
                select(LotteryResult)
                .join(LotteryGame, LotteryResult.game_id == LotteryGame.id)
                .where(
                    func.upper(LotteryGame.code) == ticket.lottery_type.upper(),
                    LotteryResult.draw_date == ticket.draw_date,
                )
            )
            result = db.execute(res_stmt).scalar_one_or_none()
            if not result:
                continue

            first_prize = result.first_prize.strip() if result.first_prize else ""
            last4 = result.last4.strip() if result.last4 else (first_prize[-4:] if len(first_prize) >= 4 else "")
            back3 = result.back3.strip() if result.back3 else (first_prize[-3:] if len(first_prize) >= 3 else "")
            last2 = result.last2.strip() if result.last2 else (first_prize[-2:] if len(first_prize) >= 2 else "")
            front3 = result.front3.strip() if result.front3 else (first_prize[:3] if len(first_prize) >= 3 else "")

            raw_numbers = [n.strip() for n in ticket.number_code.replace(" ", "").split(",") if n.strip()]

            is_won = False
            for num in raw_numbers:
                length = len(num)
                if length == 6 and num == first_prize:
                    is_won = True
                    break
                elif length == 4 and (num == last4 or num == first_prize[-4:]):
                    is_won = True
                    break
                elif length == 3 and (num == back3 or num == front3 or num == first_prize[-3:]):
                    is_won = True
                    break
                elif length == 2 and (num == last2 or num == first_prize[-2:]):
                    is_won = True
                    break

            if is_won:
                ticket.status = "WON"
            else:
                ticket.status = "MISSED"

        db.commit()
    except Exception as exc:
        db.rollback()
        print(f"Auto-check tickets error: {exc}")

@router.get("/tickets", response_model=List[UserTicketResponse])
@router.get("/tickets/", response_model=List[UserTicketResponse], include_in_schema=False)
def get_user_tickets(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retrieve all ticket entries for the currently authenticated user."""
    # Automatically check pending tickets against draw results
    auto_check_pending_tickets(db, user_id=current_user.id)

    stmt = (
        select(UserTicket)
        .where(UserTicket.user_id == current_user.id)
        .order_by(UserTicket.created_at.desc())
    )
    if status_filter:
        stmt = stmt.where(UserTicket.status == status_filter.upper())
    
    tickets = db.execute(stmt).scalars().all()
    return tickets

@router.get("/tickets/summary", response_model=UserTicketSummary)
@router.get("/tickets/summary/", response_model=UserTicketSummary, include_in_schema=False)
def get_user_ticket_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Calculate summary statistics (total spent, total won, net profit/loss, win rate) for the logged-in user."""
    auto_check_pending_tickets(db, user_id=current_user.id)

    stmt = select(UserTicket).where(UserTicket.user_id == current_user.id)
    tickets = db.execute(stmt).scalars().all()

    total_spent = sum(t.amount_spent for t in tickets)
    total_won = sum(t.prize_won for t in tickets)
    net_profit_loss = total_won - total_spent
    total_tickets = len(tickets)
    won_tickets = sum(1 for t in tickets if t.status == "WON")
    win_rate = round((won_tickets / total_tickets * 100.0), 2) if total_tickets > 0 else 0.0

    return UserTicketSummary(
        total_spent=round(total_spent, 2),
        total_won=round(total_won, 2),
        net_profit_loss=round(net_profit_loss, 2),
        total_tickets=total_tickets,
        total_won_tickets=won_tickets,
        win_rate=win_rate,
    )

@router.post("/tickets/check", response_model=UserTicketSummary)
@router.post("/tickets/check/", response_model=UserTicketSummary, include_in_schema=False)
def check_user_tickets_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Manually trigger auto-check for pending tickets of current user."""
    auto_check_pending_tickets(db, user_id=current_user.id)
    return get_user_ticket_summary(db=db, current_user=current_user)

@router.post("/tickets", response_model=UserTicketResponse, status_code=status.HTTP_201_CREATED)
@router.post("/tickets/", response_model=UserTicketResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_user_ticket(
    ticket_in: UserTicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new ticket entry for the logged in user."""
    db_ticket = UserTicket(
        user_id=current_user.id,
        draw_date=ticket_in.draw_date,
        lottery_type=ticket_in.lottery_type.upper(),
        number_code=ticket_in.number_code.strip(),
        category=ticket_in.category.upper(),
        amount_spent=ticket_in.amount_spent,
        prize_won=ticket_in.prize_won,
        status=ticket_in.status.upper(),
        notes=ticket_in.notes,
    )
    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)
    return db_ticket

@router.patch("/tickets/{ticket_id}", response_model=UserTicketResponse)
def update_user_ticket(
    ticket_id: uuid.UUID,
    ticket_in: UserTicketUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update a ticket entry (e.g. fill amount spent, notes, or winning status)."""
    stmt = select(UserTicket).where(
        UserTicket.id == ticket_id,
        UserTicket.user_id == current_user.id,
    )
    ticket = db.execute(stmt).scalar_one_or_none()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket record not found or access denied.",
        )

    update_data = ticket_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            if isinstance(value, str) and field in ["lottery_type", "category", "status"]:
                setattr(ticket, field, value.upper())
            else:
                setattr(ticket, field, value)

    db.commit()
    db.refresh(ticket)
    return ticket

@router.delete("/tickets/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_ticket(
    ticket_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a ticket entry."""
    stmt = select(UserTicket).where(
        UserTicket.id == ticket_id,
        UserTicket.user_id == current_user.id,
    )
    ticket = db.execute(stmt).scalar_one_or_none()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket record not found or access denied.",
        )

    db.delete(ticket)
    db.commit()
    return None
