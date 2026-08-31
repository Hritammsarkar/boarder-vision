"""
BorderVision AI — FastAPI Application Entry Point
Main application with CORS, lifespan management, and router mounting.
"""

import json
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .database import init_db, async_session
from .models import Camera
from .routers import cameras, zones, events, ws
from .routers.ws import get_pipeline_manager

# Default camera configurations for simulation
DEFAULT_CAMERAS = [
    {
        "name": "North Gate - Sector A",
        "location_lat": 26.9124,
        "location_lng": 75.7873,
        "fov_angle": 65.0,
        "fov_direction": 45.0,
        "stream_source": "synthetic"
    },
    {
        "name": "East Perimeter - Sector B",
        "location_lat": 26.9156,
        "location_lng": 75.7920,
        "fov_angle": 55.0,
        "fov_direction": 120.0,
        "stream_source": "synthetic"
    },
    {
        "name": "South Watchtower - Sector C",
        "location_lat": 26.9090,
        "location_lng": 75.7900,
        "fov_angle": 70.0,
        "fov_direction": 200.0,
        "stream_source": "synthetic"
    },
    {
        "name": "West Outpost - Sector D",
        "location_lat": 26.9110,
        "location_lng": 75.7840,
        "fov_angle": 60.0,
        "fov_direction": 310.0,
        "stream_source": "synthetic"
    },
]

# Default zones for demo purposes
DEFAULT_ZONES = [
    {
        "camera_index": 0,
        "zone_type": "polygon",
        "coordinates": json.dumps([[0.1, 0.3], [0.4, 0.3], [0.4, 0.7], [0.1, 0.7]]),
        "color": "#ff3333",
        "label": "Red Zone Alpha",
        "severity": "critical"
    },
    {
        "camera_index": 1,
        "zone_type": "tripwire",
        "coordinates": json.dumps([[0.2, 0.5], [0.8, 0.5]]),
        "color": "#ffaa00",
        "label": "Tripwire Bravo",
        "severity": "high"
    },
    {
        "camera_index": 2,
        "zone_type": "polygon",
        "coordinates": json.dumps([[0.5, 0.2], [0.9, 0.2], [0.9, 0.6], [0.5, 0.6]]),
        "color": "#ff5555",
        "label": "Red Zone Charlie",
        "severity": "critical"
    },
    {
        "camera_index": 3,
        "zone_type": "tripwire",
        "coordinates": json.dumps([[0.1, 0.4], [0.9, 0.6]]),
        "color": "#ff8800",
        "label": "Tripwire Delta",
        "severity": "warning"
    },
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown hooks."""
    print("=" * 60)
    print("  BORDERVISION AI - Starting Up")
    print("=" * 60)

    # Initialize database
    await init_db()
    print("[OK] Database initialized")

    # Seed default cameras if empty
    camera_ids = []
    async with async_session() as db:
        from sqlalchemy import select, func
        count_result = await db.execute(select(func.count(Camera.id)))
        count = count_result.scalar() or 0

        if count == 0:
            print("[*] Seeding default cameras...")
            for cam_data in DEFAULT_CAMERAS:
                cam = Camera(id=str(uuid.uuid4()), **cam_data)
                db.add(cam)
                camera_ids.append(cam.id)
            await db.commit()

            # Seed default zones
            from .models import Zone
            for zone_data in DEFAULT_ZONES:
                cam_idx = zone_data["camera_index"]
                if cam_idx < len(camera_ids):
                    zone_dict = {k: v for k, v in zone_data.items() if k != "camera_index"}
                    zone = Zone(
                        id=str(uuid.uuid4()),
                        camera_id=camera_ids[cam_idx],
                        **zone_dict
                    )
                    db.add(zone)
            await db.commit()
            print(f"[OK] Seeded {len(camera_ids)} cameras and {len(DEFAULT_ZONES)} zones")
        else:
            # Load existing cameras with their stream sources (only online cameras)
            result = await db.execute(select(Camera).where(Camera.status == "online"))
            existing_cameras = result.scalars().all()
            camera_configs = [(c.id, c.stream_source) for c in existing_cameras]
            print(f"[OK] Loaded {len(camera_configs)} active online cameras")

    # Initialize vision pipelines
    pm = get_pipeline_manager()
    if count == 0:
        camera_configs = [(cid, "synthetic") for cid in camera_ids]

    for cam_id, source in camera_configs:
        pipeline = pm.create_pipeline(cam_id, source=source)
        pipeline.start()

        # Load zones for each pipeline
        async with async_session() as db:
            from sqlalchemy import select as sel
            from .models import Zone
            result = await db.execute(sel(Zone).where(Zone.camera_id == cam_id))
            db_zones = result.scalars().all()
            zones_data = [
                {
                    "id": z.id,
                    "zone_type": z.zone_type,
                    "coordinates": z.coordinates,
                    "color": z.color,
                    "label": z.label,
                    "severity": z.severity,
                    "is_active": z.is_active
                }
                for z in db_zones
            ]
            pipeline.update_zones(zones_data)

    print(f"[OK] Started {len(camera_configs)} vision pipelines")
    print("=" * 60)
    print(f"  API: http://localhost:{settings.PORT}")
    print(f"  Docs: http://localhost:{settings.PORT}/docs")
    print("=" * 60)

    yield

    # Shutdown
    print("\n[*] Shutting down vision pipelines...")
    pm.stop_all()
    print("[OK] BorderVision AI stopped")


# Create FastAPI app
app = FastAPI(
    title="BorderVision AI",
    description="AI-Powered Border Surveillance & Video Analytics Platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for snapshots
try:
    app.mount("/snapshots", StaticFiles(directory=str(settings.SNAPSHOT_DIR)), name="snapshots")
except Exception:
    pass  # Directory may not exist yet on first run

# Mount routers
app.include_router(cameras.router, prefix="/api/v1")
app.include_router(zones.router, prefix="/api/v1")
app.include_router(events.router, prefix="/api/v1")
app.include_router(ws.router)


@app.get("/")
async def root():
    return {
        "name": "BorderVision AI",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs"
    }


@app.get("/api/v1/stats")
async def system_stats():
    """Get real-time system statistics."""
    pm = get_pipeline_manager()
    return {
        "active_cameras": len(pm.pipelines),
        "total_detections": pm.total_detections,
        "active_breaches": pm.active_breaches,
        "uptime_seconds": round(pm.uptime, 1)
    }
