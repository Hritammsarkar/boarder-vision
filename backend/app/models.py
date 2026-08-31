"""
BorderVision AI — SQLAlchemy ORM Models
Event-driven schema for cameras, zones, and breach events.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Camera(Base):
    """Represents a surveillance camera / video source."""
    __tablename__ = "cameras"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    location_lat: Mapped[float] = mapped_column(Float, default=26.9124)
    location_lng: Mapped[float] = mapped_column(Float, default=75.7873)
    status: Mapped[str] = mapped_column(String(20), default="online")  # online, offline, maintenance
    stream_source: Mapped[str] = mapped_column(String(500), default="synthetic")  # synthetic, webcam, or file path
    fov_angle: Mapped[float] = mapped_column(Float, default=60.0)  # Field of view in degrees
    fov_direction: Mapped[float] = mapped_column(Float, default=0.0)  # Bearing in degrees (0=North)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)

    # Relationships
    zones: Mapped[list["Zone"]] = relationship("Zone", back_populates="camera", cascade="all, delete-orphan")
    events: Mapped[list["Event"]] = relationship("Event", back_populates="camera", cascade="all, delete-orphan")


class Zone(Base):
    """A geofence polygon or tripwire line defined on a camera view."""
    __tablename__ = "zones"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    camera_id: Mapped[str] = mapped_column(String(36), ForeignKey("cameras.id"), nullable=False)
    zone_type: Mapped[str] = mapped_column(String(20), nullable=False)  # polygon, tripwire
    coordinates: Mapped[str] = mapped_column(Text, nullable=False)  # JSON array of [x, y] pairs (normalized 0-1)
    color: Mapped[str] = mapped_column(String(20), default="#ff0000")
    label: Mapped[str] = mapped_column(String(100), default="Zone")
    severity: Mapped[str] = mapped_column(String(20), default="critical")  # critical, high, warning
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)

    # Relationships
    camera: Mapped["Camera"] = relationship("Camera", back_populates="zones")
    events: Mapped[list["Event"]] = relationship("Event", back_populates="zone", cascade="all, delete-orphan")


class Event(Base):
    """A breach / detection event logged by the vision pipeline."""
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    camera_id: Mapped[str] = mapped_column(String(36), ForeignKey("cameras.id"), nullable=False)
    zone_id: Mapped[str] = mapped_column(String(36), ForeignKey("zones.id"), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, index=True)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)  # critical, high, warning
    object_class: Mapped[str] = mapped_column(String(30), nullable=False)  # human, vehicle, wildlife
    object_id: Mapped[int] = mapped_column(Integer, default=0)  # Track ID
    snapshot_path: Mapped[str] = mapped_column(String(500), nullable=True)
    acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)
    description: Mapped[str] = mapped_column(Text, default="")

    # Relationships
    camera: Mapped["Camera"] = relationship("Camera", back_populates="events")
    zone: Mapped["Zone"] = relationship("Zone", back_populates="events")
