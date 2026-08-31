"""
BorderVision AI — Zone API Router
CRUD operations for geofence polygons and tripwire lines.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from ..database import get_db
from ..models import Zone
from ..schemas import ZoneCreate, ZoneUpdate, ZoneResponse

router = APIRouter(prefix="/zones", tags=["zones"])


@router.get("/", response_model=list[ZoneResponse])
async def list_zones(
    camera_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """List zones, optionally filtered by camera_id."""
    query = select(Zone).order_by(Zone.created_at)
    if camera_id:
        query = query.where(Zone.camera_id == camera_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{zone_id}", response_model=ZoneResponse)
async def get_zone(zone_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single zone by ID."""
    result = await db.execute(select(Zone).where(Zone.id == zone_id))
    zone = result.scalar_one_or_none()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    return zone


@router.post("/", response_model=ZoneResponse, status_code=201)
async def create_zone(zone: ZoneCreate, db: AsyncSession = Depends(get_db)):
    """Create a new geofence polygon or tripwire line."""
    import json
    # Validate coordinates JSON
    try:
        coords = json.loads(zone.coordinates)
        if not isinstance(coords, list) or len(coords) < 2:
            raise ValueError("Need at least 2 coordinate pairs")
        if zone.zone_type == "polygon" and len(coords) < 3:
            raise ValueError("Polygon needs at least 3 vertices")
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(status_code=422, detail=f"Invalid coordinates: {e}")

    db_zone = Zone(**zone.model_dump())
    db.add(db_zone)
    await db.flush()
    await db.refresh(db_zone)
    return db_zone


@router.put("/{zone_id}", response_model=ZoneResponse)
async def update_zone(zone_id: str, update: ZoneUpdate, db: AsyncSession = Depends(get_db)):
    """Update zone properties (coordinates, color, label, etc)."""
    result = await db.execute(select(Zone).where(Zone.id == zone_id))
    zone = result.scalar_one_or_none()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    update_data = update.model_dump(exclude_unset=True)

    if "coordinates" in update_data:
        import json
        try:
            coords = json.loads(update_data["coordinates"])
            if not isinstance(coords, list):
                raise ValueError("Coordinates must be a JSON array")
        except (json.JSONDecodeError, ValueError) as e:
            raise HTTPException(status_code=422, detail=f"Invalid coordinates: {e}")

    for key, value in update_data.items():
        setattr(zone, key, value)

    await db.flush()
    await db.refresh(zone)
    return zone


@router.delete("/{zone_id}", status_code=204)
async def delete_zone(zone_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a zone."""
    result = await db.execute(select(Zone).where(Zone.id == zone_id))
    zone = result.scalar_one_or_none()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    await db.delete(zone)
