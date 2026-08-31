"""
BorderVision AI — Pydantic Schemas
Request/response validation models for the REST API.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ── Camera Schemas ──────────────────────────────────────────────────────────

class CameraBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    location_lat: float = Field(default=26.9124, ge=-90, le=90)
    location_lng: float = Field(default=75.7873, ge=-180, le=180)
    stream_source: str = Field(default="synthetic")
    fov_angle: float = Field(default=60.0, ge=10, le=180)
    fov_direction: float = Field(default=0.0, ge=0, le=360)


class CameraCreate(CameraBase):
    pass


class CameraUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    stream_source: Optional[str] = None
    fov_angle: Optional[float] = None
    fov_direction: Optional[float] = None


class CameraResponse(CameraBase):
    id: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Zone Schemas ────────────────────────────────────────────────────────────

class ZoneBase(BaseModel):
    camera_id: str
    zone_type: str = Field(..., pattern="^(polygon|tripwire)$")
    coordinates: str = Field(..., description="JSON array of [x, y] normalized pairs")
    color: str = Field(default="#ff0000")
    label: str = Field(default="Zone", max_length=100)
    severity: str = Field(default="critical", pattern="^(critical|high|warning)$")


class ZoneCreate(ZoneBase):
    pass


class ZoneUpdate(BaseModel):
    coordinates: Optional[str] = None
    color: Optional[str] = None
    label: Optional[str] = None
    severity: Optional[str] = None
    is_active: Optional[bool] = None


class ZoneResponse(ZoneBase):
    id: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Event Schemas ───────────────────────────────────────────────────────────

class EventResponse(BaseModel):
    id: str
    camera_id: str
    zone_id: Optional[str] = None
    timestamp: datetime
    severity: str
    object_class: str
    object_id: int
    snapshot_path: Optional[str] = None
    acknowledged: bool
    description: str

    class Config:
        from_attributes = True


class EventFilter(BaseModel):
    camera_id: Optional[str] = None
    severity: Optional[str] = None
    acknowledged: Optional[bool] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=200)


class EventAcknowledge(BaseModel):
    acknowledged: bool = True


# ── WebSocket Message Schemas ───────────────────────────────────────────────

class WSDetection(BaseModel):
    bbox: list[float]  # [x1, y1, x2, y2] normalized
    confidence: float
    object_class: str
    track_id: int


class WSBreachEvent(BaseModel):
    event_id: str
    camera_id: str
    zone_id: str
    zone_label: str
    severity: str
    object_class: str
    object_id: int
    timestamp: str
    description: str
    snapshot_url: Optional[str] = None


class WSFrameMessage(BaseModel):
    type: str = "frame"
    camera_id: str
    detections: list[WSDetection] = []
    breach_events: list[WSBreachEvent] = []
    fps: float = 0.0
    clahe_enabled: bool = False


# ── Stats Schema ────────────────────────────────────────────────────────────

class SystemStats(BaseModel):
    active_cameras: int = 0
    total_detections: int = 0
    active_breaches: int = 0
    total_events_today: int = 0
    uptime_seconds: float = 0.0
