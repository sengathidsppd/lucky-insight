"""Pydantic schemas for data import and export APIs."""

from pydantic import BaseModel


class ImportErrorDetails(BaseModel):
    """Details of a row parsing error during CSV import."""

    row: int
    error: str


class ImportSummaryResponse(BaseModel):
    """Summary of data import job execution."""

    success: bool = True
    message: str = "Import completed successfully."
    imported_count: int
    failed_count: int
    errors: list[ImportErrorDetails]
