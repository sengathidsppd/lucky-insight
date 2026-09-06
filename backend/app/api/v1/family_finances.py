"""Family Finance & Treasury Balance API endpoints (v1)."""

import uuid
from datetime import date

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_active_user
from app.core.database import get_db
from app.core.logging import get_logger
from app.models.user import User
from app.repositories.family_finance_repository import FamilyFinanceRepository
from app.schemas.family_finance import (
    FamilyFinanceSummary,
    FamilyTransactionCreate,
    FamilyTransactionResponse,
    FamilyTransactionUpdate,
    GoogleSheetConfig,
    GoogleSheetSyncResponse,
)
from app.services.family_finance_service import FamilyFinanceService
from app.services.google_sheets_service import GoogleSheetsService

logger = get_logger(__name__)
router = APIRouter(prefix="/finances", tags=["Family Finance"])

ALLOWED_FAMILY_EMAILS = {"suzu@gmail.com", "ning80074@gmail.com"}


def get_finance_service(db: Session = Depends(get_db)) -> FamilyFinanceService:
    """Dependency for request-scoped FamilyFinanceService."""
    return FamilyFinanceService(FamilyFinanceRepository(db))


def require_family_member(current_user: User = Depends(get_current_active_user)) -> User:
    """Ensure user is an authorized family member."""
    if current_user.email not in ALLOWED_FAMILY_EMAILS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to authorized family members.",
        )
    return current_user


@router.get("/summary", response_model=FamilyFinanceSummary)
def get_finance_summary(
    currency: str = Query(default="LAK", description="Currency code (LAK)"),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    service: FamilyFinanceService = Depends(get_finance_service),
    _: User = Depends(require_family_member),
) -> FamilyFinanceSummary:
    """Get financial overview including total income, total expense, and remaining net balance."""
    return service.get_summary(currency=currency, date_from=date_from, date_to=date_to)


@router.get("", response_model=list[FamilyTransactionResponse])
def list_transactions(
    currency: str | None = Query(default=None),
    transaction_type: str | None = Query(default=None),
    category: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    service: FamilyFinanceService = Depends(get_finance_service),
    _: User = Depends(require_family_member),
) -> list[FamilyTransactionResponse]:
    """List family financial transactions."""
    results = service.list_transactions(
        currency=currency,
        transaction_type=transaction_type,
        category=category,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
        offset=offset,
    )
    return [FamilyTransactionResponse.model_validate(r) for r in results]


@router.post("", response_model=FamilyTransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: FamilyTransactionCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_family_member),
    service: FamilyFinanceService = Depends(get_finance_service),
    db: Session = Depends(get_db),
) -> FamilyTransactionResponse:
    """Record a new financial transaction (Income deposit or Expense deduction)."""
    created = service.create_transaction(current_user.id, payload)
    db.commit()
    db.refresh(created)

    # Format payload BEFORE session closes to avoid DetachedInstanceError in background task
    tx_payload = GoogleSheetsService.format_transaction(created)

    # Automatically trigger Google Sheets sync in background if configured
    try:
        config = service.get_google_sheet_config()
        webhook_url = config.webhook_url or "https://script.google.com/macros/s/AKfycbzCrVAg0qzIT2Imkua44UovZOM2EjA9qbSqBM2t9winCLMTOWqFEAIRrT0HQXTOQpw0Fg/exec"
        if config.is_auto_sync and webhook_url:
            background_tasks.add_task(
                GoogleSheetsService.sync_raw_transaction,
                webhook_url,
                tx_payload,
            )
    except Exception as exc:
        logger.warning("Failed to schedule background Google Sheet sync: %s", exc)


    return FamilyTransactionResponse.model_validate(created)


@router.put("/{transaction_id}", response_model=FamilyTransactionResponse)
def update_transaction(
    transaction_id: uuid.UUID,
    payload: FamilyTransactionUpdate,
    service: FamilyFinanceService = Depends(get_finance_service),
    _: User = Depends(require_family_member),
    db: Session = Depends(get_db),
) -> FamilyTransactionResponse:
    """Update an existing financial transaction."""
    updated = service.update_transaction(transaction_id, payload)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found.",
        )
    db.commit()
    return FamilyTransactionResponse.model_validate(updated)


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    transaction_id: uuid.UUID,
    service: FamilyFinanceService = Depends(get_finance_service),
    _: User = Depends(require_family_member),
    db: Session = Depends(get_db),
) -> None:
    """Delete a transaction by UUID."""
    service.delete_transaction(transaction_id)
    db.commit()


@router.get("/google-sheets", response_model=GoogleSheetConfig)
def get_google_sheet_settings(
    service: FamilyFinanceService = Depends(get_finance_service),
    _: User = Depends(require_family_member),
) -> GoogleSheetConfig:
    """Get family Google Sheets sync configuration."""
    return service.get_google_sheet_config()


@router.post("/google-sheets", response_model=GoogleSheetConfig)
def update_google_sheet_settings(
    payload: GoogleSheetConfig,
    service: FamilyFinanceService = Depends(get_finance_service),
    _: User = Depends(require_family_member),
    db: Session = Depends(get_db),
) -> GoogleSheetConfig:
    """Update family Google Sheets sync configuration."""
    updated = service.set_google_sheet_config(payload)
    db.commit()
    return updated


@router.post("/google-sheets/test", response_model=GoogleSheetSyncResponse)
def test_google_sheet_connection(
    payload: GoogleSheetConfig,
    _: User = Depends(require_family_member),
) -> GoogleSheetSyncResponse:
    """Test ping to Google Apps Script Webhook."""
    if not payload.webhook_url or not payload.webhook_url.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Webhook URL cannot be empty.",
        )
    try:
        GoogleSheetsService.test_connection(payload.webhook_url.strip())
        return GoogleSheetSyncResponse(
            status="success",
            message="Successfully connected to Google Sheet Webhook!",
            synced_count=0,
        )
    except Exception as exc:
        logger.error("Google Sheet test ping failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to connect to Google Sheet Webhook: {str(exc)}",
        ) from exc


@router.post("/google-sheets/sync-all", response_model=GoogleSheetSyncResponse)
def sync_all_to_google_sheet(
    service: FamilyFinanceService = Depends(get_finance_service),
    _: User = Depends(require_family_member),
) -> GoogleSheetSyncResponse:
    """Batch-sync all transactions to the configured Google Sheet."""
    config = service.get_google_sheet_config()
    webhook_url = (config.webhook_url and config.webhook_url.strip()) or "https://script.google.com/macros/s/AKfycbzCrVAg0qzIT2Imkua44UovZOM2EjA9qbSqBM2t9winCLMTOWqFEAIRrT0HQXTOQpw0Fg/exec"
    transactions = list(service.list_transactions(limit=500))
    # Reverse so oldest transactions come first when appending to sheet
    transactions.reverse()
    try:
        count = GoogleSheetsService.sync_all_transactions(webhook_url, transactions)
        return GoogleSheetSyncResponse(
            status="success",
            message=f"Successfully synced {count} transactions to Google Sheet.",
            synced_count=count,
        )
    except Exception as exc:
        logger.error("Batch sync to Google Sheet failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Google Sheet sync failed: {str(exc)}",
        ) from exc


