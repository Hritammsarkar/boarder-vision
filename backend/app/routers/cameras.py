"""
BorderVision AI — Camera API Router
CRUD operations for surveillance cameras.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Camera
from ..schemas import CameraCreate, CameraUpdate, CameraResponse

router = APIRouter(prefix="/cameras", tags=["cameras"])


@router.get("/", response_model=list[CameraResponse])
async def list_cameras(db: AsyncSession = Depends(get_db)):
    """List all registered cameras."""
    result = await db.execute(select(Camera).order_by(Camera.created_at))
    cameras = result.scalars().all()
    return cameras


@router.get("/{camera_id}", response_model=CameraResponse)
async def get_camera(camera_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single camera by ID."""
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    return camera


@router.post("/", response_model=CameraResponse, status_code=201)
async def create_camera(camera: CameraCreate, db: AsyncSession = Depends(get_db)):
    """Register a new camera."""
    db_camera = Camera(**camera.model_dump())
    db.add(db_camera)
    await db.flush()
    await db.refresh(db_camera)
    return db_camera


@router.patch("/{camera_id}", response_model=CameraResponse)
async def update_camera(camera_id: str, update: CameraUpdate, db: AsyncSession = Depends(get_db)):
    """Update camera properties."""
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(camera, key, value)

    await db.flush()
    await db.refresh(camera)
    return camera


@router.delete("/{camera_id}", status_code=204)
async def delete_camera(camera_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a camera and all associated zones/events."""
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    await db.delete(camera)
