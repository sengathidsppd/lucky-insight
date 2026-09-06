"""Service for pushing family financial transactions to Google Sheets via Webhook."""

from typing import Any

import httpx

from app.core.logging import get_logger
from app.models.family_transaction import FamilyTransaction

logger = get_logger(__name__)


class GoogleSheetsService:
    """Handles communication with Google Apps Script webhooks for spreadsheet synchronization."""

    @staticmethod
    def format_transaction(tx: FamilyTransaction) -> dict[str, Any]:
        """Format a single FamilyTransaction into JSON payload for Google Sheets."""
        return {
            "id": str(tx.id),
            "date": tx.transaction_date.isoformat(),
            "type": tx.transaction_type,
            "amount": float(tx.amount),
            "currency": tx.currency,
            "category": tx.category,
            "payer": tx.payer_name,
            "description": tx.description or "",
            "created_at": tx.created_at.strftime("%Y-%m-%d %H:%M:%S") if tx.created_at else "",
        }

    @classmethod
    def send_payload(cls, webhook_url: str, payload: dict[str, Any]) -> dict[str, Any]:
        """Post JSON payload to Google Apps Script Webhook with redirect following."""
        if not webhook_url or not webhook_url.strip():
            raise ValueError("Webhook URL is empty or invalid.")

        url = webhook_url.strip()
        # Google Apps Script Webhook redirects (HTTP 302) to script.googleusercontent.com
        with httpx.Client(follow_redirects=True, timeout=20.0) as client:
            resp = client.post(
                url,
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            resp.raise_for_status()
            try:
                return resp.json()
            except Exception:
                return {"status": "success", "raw": resp.text}

    @classmethod
    def sync_raw_transaction(cls, webhook_url: str, tx_data: dict[str, Any]) -> bool:
        """Sync a pre-formatted transaction dictionary to Google Sheet in background."""
        try:
            payload = {
                "action": "create",
                "transaction": tx_data,
            }
            cls.send_payload(webhook_url, payload)
            logger.info("Successfully synced transaction %s to Google Sheet.", tx_data.get("id"))
            return True
        except Exception as exc:
            logger.warning(
                "Failed to sync transaction %s to Google Sheet: %s",
                tx_data.get("id"),
                exc,
            )
            return False

    @classmethod
    def sync_transaction(cls, webhook_url: str, tx: FamilyTransaction) -> bool:
        """Sync a single FamilyTransaction model."""
        try:
            tx_data = cls.format_transaction(tx)
            return cls.sync_raw_transaction(webhook_url, tx_data)
        except Exception as exc:
            logger.warning("Failed to format or sync transaction: %s", exc)
            return False


    @classmethod
    def sync_all_transactions(cls, webhook_url: str, transactions: list[FamilyTransaction]) -> int:
        """Batch sync a list of transactions to Google Sheet. Returns count of synced items."""
        if not transactions:
            return 0

        payload = {
            "action": "batch_sync",
            "transactions": [cls.format_transaction(tx) for tx in transactions],
        }
        cls.send_payload(webhook_url, payload)
        logger.info("Successfully batch-synced %d transactions to Google Sheet.", len(transactions))
        return len(transactions)

    @classmethod
    def test_connection(cls, webhook_url: str) -> dict[str, Any]:
        """Send a lightweight test ping to verify Google Apps Script Webhook connectivity."""
        payload = {
            "action": "test",
            "message": "Lucky Insight Connection Ping",
        }
        return cls.send_payload(webhook_url, payload)
