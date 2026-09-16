"""POST /api/scrape — validate URLs, create a job, queue the background worker.

Behavior per spec §8:
* All submitted URLs are validated up front with the scraper's
  ``validate_facebook_url``; invalid ones are recorded as error_details
  attached to the job and only valid sources are queued.
* If zero URLs survive validation, the request fails with 400
  {"error": {"code": "invalid_input", ...}}.
* The worker runs in a ThreadPoolExecutor so this route returns immediately
  with 201 {"job_id", "status": "queued"}.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.auth.dependencies import get_current_user
from backend.core.database import get_db
from backend.models.user import User
from backend.schemas.scrape import ScrapeRequest, ScrapeResponse
from backend.services.job_service import start_scrape_job

router = APIRouter(tags=["scrape"])


@router.post(
    "/scrape",
    response_model=ScrapeResponse,
    status_code=201,
    summary="Start a scraping job",
)
def create_job(
    payload: ScrapeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ScrapeResponse:
    """Validate the submitted URLs and queue the background scraping job."""
    job = start_scrape_job(db, payload, owner_id=current_user.id)
    return ScrapeResponse(job_id=job.id, status="queued")