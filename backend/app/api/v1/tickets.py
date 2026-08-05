import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.models.user_ticket import UserTicket
from app.schemas.ticket import (
    UserTicketCreate,
    UserTicketResponse,
    UserTicketSummary,
    UserTicketUpdate,
)

router = APIRouter()

@router.get("", response_model=List[UserTicketResponse])
def get_user_tickets(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve all ticket entries for the currently authenticated user."""
    stmt = (
        select(UserTicket)
        .where(UserTicket.user_id == current_user.id)
        .order_by(UserTicket.created_at.desc())
    )
    if status_filter:
        stmt = stmt.where(UserTicket.status == status_filter.upper())
    
    tickets = db.execute(stmt).scalars().all()
    return tickets

@router.get("/summary", response_model=UserTicketSummary)
def get_user_ticket_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Calculate summary statistics (total spent, total won, net profit/loss, win rate) for the logged-in user."""
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

@router.post("", response_model=UserTicketResponse, status_code=status.HTTP_201_CREATED)
def create_user_ticket(
    ticket_in: UserTicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
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

@router.patch("/{ticket_id}", response_model=UserTicketResponse)
def update_user_ticket(
    ticket_id: uuid.UUID,
    ticket_in: UserTicketUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
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

@router.delete("/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_ticket(
    ticket_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
