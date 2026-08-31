"""
BorderVision AI — WebSocket Video Streaming Router
Streams annotated JPEG frames and broadcasts breach events.
Protocol: binary messages = JPEG frame, text messages = JSON event.
"""

import asyncio
import json
import time
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db, async_session
from ..models import Camera, Zone, Event
from ..vision.pipeline import VisionPipeline, PipelineManager

router = APIRouter(tags=["websocket"])

# Global pipeline manager (initialized in main.py lifespan)
pipeline_manager: Optional[PipelineManager] = None


def get_pipeline_manager() -> PipelineManager:
    global pipeline_manager
    if pipeline_manager is None:
        pipeline_manager = PipelineManager()
    return pipeline_manager


class ConnectionManager:
    """Manages WebSocket connections per camera."""

    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, camera_id: str, websocket: WebSocket):
        await websocket.accept()
        if camera_id not in self.active_connections:
            self.active_connections[camera_id] = []
        self.active_connections[camera_id].append(websocket)

    def disconnect(self, camera_id: str, websocket: WebSocket):
        if camera_id in self.active_connections:
            self.active_connections[camera_id] = [
                ws for ws in self.active_connections[camera_id] if ws != websocket
            ]

    async def broadcast_frame(self, camera_id: str, frame_bytes: bytes):
        """Send JPEG frame to all connected clients for a camera."""
        if camera_id not in self.active_connections:
            return
        dead = []
        for ws in self.active_connections[camera_id]:
            try:
                await ws.send_bytes(frame_bytes)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.active_connections[camera_id].remove(ws)

    async def broadcast_event(self, camera_id: str, event_data: dict):
        """Send breach event JSON to all connected clients."""
        if camera_id not in self.active_connections:
            return
        msg = json.dumps(event_data)
        dead = []
        for ws in self.active_connections[camera_id]:
            try:
                await ws.send_text(msg)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.active_connections[camera_id].remove(ws)


ws_manager = ConnectionManager()


@router.websocket("/ws/stream/{camera_id}")
async def stream_video(websocket: WebSocket, camera_id: str):
    """
    WebSocket endpoint for real-time video streaming.
    Sends JPEG frames (binary) and breach events (JSON text) interleaved.
    """
    pm = get_pipeline_manager()
    pipeline = pm.get_pipeline(camera_id)

    if pipeline is None:
        # Auto-create pipeline for unknown cameras
        pipeline = pm.create_pipeline(camera_id)
        pipeline.start()

        # Load zones from DB
        async with async_session() as db:
            result = await db.execute(select(Zone).where(Zone.camera_id == camera_id))
            zones = result.scalars().all()
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
                for z in zones
            ]
            pipeline.update_zones(zones_data)

    await ws_manager.connect(camera_id, websocket)

    try:
        # Frame streaming loop
        frame_interval = 1.0 / 15  # Target 15 FPS
        while True:
            start = time.time()

            result = pipeline.process_frame()
            if result:
                # Send annotated frame
                try:
                    await websocket.send_bytes(result["frame_bytes"])
                except Exception:
                    break

                # Send breach events
                for breach in result.get("breach_events", []):
                    try:
                        await websocket.send_text(json.dumps({
                            "type": "breach",
                            **breach
                        }))
                    except Exception:
                        break

                    # Persist event to database
                    try:
                        async with async_session() as db:
                            event = Event(
                                id=breach["event_id"],
                                camera_id=breach["camera_id"],
                                zone_id=breach["zone_id"],
                                severity=breach["severity"],
                                object_class=breach["object_class"],
                                object_id=breach["object_id"],
                                description=breach["description"]
                            )
                            # Save snapshot
                            snapshot_path = pipeline.save_snapshot(
                                result["frame_bytes"], breach["event_id"]
                            )
                            event.snapshot_path = snapshot_path
                            db.add(event)
                            await db.commit()
                    except Exception as e:
                        print(f"[WARN] Failed to persist event: {e}")

                # Send stats periodically (every ~30 frames)
                if pipeline.stream.frame_count % 30 == 0:
                    try:
                        await websocket.send_text(json.dumps({
                            "type": "stats",
                            "fps": result["fps"],
                            "detections": len(result["detections"]),
                            "clahe_enabled": result["clahe_enabled"],
                            "camera_id": camera_id
                        }))
                    except Exception:
                        break

            # Throttle to target FPS
            elapsed = time.time() - start
            sleep_time = max(0, frame_interval - elapsed)
            await asyncio.sleep(sleep_time)

            # Check for incoming messages (non-blocking)
            try:
                msg = await asyncio.wait_for(websocket.receive_text(), timeout=0.001)
                # Handle client commands
                try:
                    cmd = json.loads(msg)
                    if cmd.get("type") == "toggle_clahe":
                        pipeline.enhancer.toggle(cmd.get("enabled", True))
                    elif cmd.get("type") == "reload_zones":
                        async with async_session() as db:
                            result_db = await db.execute(
                                select(Zone).where(Zone.camera_id == camera_id)
                            )
                            zones = result_db.scalars().all()
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
                                for z in zones
                            ]
                            pipeline.update_zones(zones_data)
                except json.JSONDecodeError:
                    pass
            except (asyncio.TimeoutError, WebSocketDisconnect):
                pass

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[ERROR] WebSocket error for {camera_id}: {e}")
    finally:
        ws_manager.disconnect(camera_id, websocket)


@router.websocket("/ws/events")
async def event_feed(websocket: WebSocket):
    """
    Global event feed WebSocket.
    Broadcasts all breach events from all cameras to connected dashboards.
    """
    await websocket.accept()
    pm = get_pipeline_manager()

    try:
        while True:
            # Poll all pipelines for new events
            for camera_id, pipeline in pm.pipelines.items():
                result = pipeline.process_frame()
                if result:
                    for breach in result.get("breach_events", []):
                        try:
                            await websocket.send_text(json.dumps({
                                "type": "breach",
                                **breach
                            }))
                        except Exception:
                            return

            await asyncio.sleep(0.1)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[ERROR] Event feed WS error: {e}")
