"""
BorderVision AI — Events API Router
Querying, filtering, acknowledging, and exporting breach events.
"""

import csv
import io
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Event
from ..schemas import EventResponse

router = APIRouter(prefix="/events", tags=["events"])


@router.get("/", response_model=list[EventResponse])
async def list_events(
    camera_id: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    acknowledged: Optional[bool] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    """List events with optional filters and pagination."""
    query = select(Event).order_by(desc(Event.timestamp))

    filters = []
    if camera_id:
        filters.append(Event.camera_id == camera_id)
    if severity:
        filters.append(Event.severity == severity)
    if acknowledged is not None:
        filters.append(Event.acknowledged == acknowledged)
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date)
            filters.append(Event.timestamp >= start_dt)
        except ValueError:
            pass
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date)
            filters.append(Event.timestamp <= end_dt)
        except ValueError:
            pass

    if filters:
        query = query.where(and_(*filters))

    # Pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/count")
async def count_events(
    severity: Optional[str] = Query(None),
    acknowledged: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Get event counts for dashboard stats."""
    query = select(func.count(Event.id))
    if severity:
        query = query.where(Event.severity == severity)
    if acknowledged is not None:
        query = query.where(Event.acknowledged == acknowledged)

    result = await db.execute(query)
    count = result.scalar() or 0
    return {"count": count}


@router.get("/today-count")
async def count_today_events(db: AsyncSession = Depends(get_db)):
    """Get count of events logged today."""
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(
        select(func.count(Event.id)).where(Event.timestamp >= today_start)
    )
    count = result.scalar() or 0
    return {"count": count}


@router.post("/{event_id}/acknowledge")
async def acknowledge_event(event_id: str, db: AsyncSession = Depends(get_db)):
    """Mark an event as acknowledged."""
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    event.acknowledged = True
    await db.flush()
    return {"status": "acknowledged", "event_id": event_id}


@router.get("/export")
async def export_events(
    camera_id: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Export events as CSV file."""
    query = select(Event).order_by(desc(Event.timestamp))

    filters = []
    if camera_id:
        filters.append(Event.camera_id == camera_id)
    if severity:
        filters.append(Event.severity == severity)
    if start_date:
        try:
            filters.append(Event.timestamp >= datetime.fromisoformat(start_date))
        except ValueError:
            pass
    if end_date:
        try:
            filters.append(Event.timestamp <= datetime.fromisoformat(end_date))
        except ValueError:
            pass

    if filters:
        query = query.where(and_(*filters))

    result = await db.execute(query)
    events = result.scalars().all()

    # Generate CSV
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Camera ID", "Zone ID", "Timestamp", "Severity",
        "Object Class", "Object ID", "Acknowledged", "Description"
    ])

    for event in events:
        writer.writerow([
            event.id, event.camera_id, event.zone_id or "",
            event.timestamp.isoformat(), event.severity,
            event.object_class, event.object_id,
            event.acknowledged, event.description
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=bordervision_events.csv"}
    )
