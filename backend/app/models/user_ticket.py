import uuid
from datetime import date, datetime
from sqlalchemy import Column, String, Float, DateTime, Date, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base

class UserTicket(Base):
    __tablename__ = "user_tickets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    draw_date = Column(Date, nullable=False, default=date.today)
    lottery_type = Column(String(50), nullable=False, default="LAO")  # e.g. "LAO", "THAI"
    number_code = Column(String(20), nullable=False)  # e.g. "932479", "59"
    category = Column(String(10), nullable=False, default="6D")  # "6D", "4D", "3D", "2D"
    
    amount_spent = Column(Float, nullable=False, default=0.0)  # Amount spent in LAK Kip or THB
    prize_won = Column(Float, nullable=False, default=0.0)  # Prize money won
    
    status = Column(String(20), nullable=False, default="PENDING")  # "PENDING", "WON", "MISSED"
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", backref="tickets")
