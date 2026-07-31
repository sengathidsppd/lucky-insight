"""Notifications API endpoint (v1).

Manages user notifications for draw results, frequency insights, and system alerts.
"""

from datetime import datetime, UTC
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.api.dependencies.auth import get_current_active_user
from app.core.logging import get_logger
from app.models.user import User

logger = get_logger(__name__)
router = APIRouter(prefix="/notifications", tags=["Notifications"])

# In-memory notifications store for instant responsiveness
MOCK_NOTIFICATIONS = [
    {
        "id": "notif-001",
        "title": "🎉 New Lao Draw Results Published!",
        "message": "Lao Development Lottery draw results for July 2026 are now available.",
        "type": "RESULT_UPDATE",
        "is_read": False,
        "created_at": datetime.now(UTC).isoformat(),
    },
    {
        "id": "notif-002",
        "title": "📊 Statistical Pattern Insight Available",
        "message": "Your Frequency Model run completed with 100% precision score.",
        "type": "INSIGHT",
        "is_read": False,
        "created_at": datetime.now(UTC).isoformat(),
    },
]


@router.get(
    "",
    status_code=status.HTTP_200_OK,
    summary="Get user notifications",
)
def get_user_notifications(
    current_user: User = Depends(get_current_active_user),
) -> dict[str, Any]:
    """Return user notifications list."""
    unread_count = sum(1 for n in MOCK_NOTIFICATIONS if not n["is_read"])
    return {
        "success": True,
        "unread_count": unread_count,
        "data": MOCK_NOTIFICATIONS,
    }


@router.post(
    "/{notification_id}/read",
    status_code=status.HTTP_200_OK,
    summary="Mark notification as read",
)
def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_active_user),
) -> dict[str, Any]:
    """Mark a notification as read."""
    for n in MOCK_NOTIFICATIONS:
        if n["id"] == notification_id:
            n["is_read"] = True
            return {"success": True, "message": "Notification marked as read."}

    raise HTTPException(status_code=404, detail="Notification not found.")
