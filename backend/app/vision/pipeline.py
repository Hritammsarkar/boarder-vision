"""
BorderVision AI — Vision Pipeline Orchestrator
Ties together stream → enhance → detect → track → geofence → annotate → dispatch.
"""

import asyncio
import json
import time
import uuid
from datetime import datetime, timezone
from typing import Optional
from io import BytesIO

import numpy as np

try:
    import cv2
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False

from ..config import settings
from .stream import StreamSimulator
from .enhancer import CLAHEEnhancer
from .detector import YOLODetector, Detection
from .tracker import ObjectTracker
from .geofence import GeofenceEngine, BreachEvent


class VisionPipeline:
    """
    Main vision pipeline orchestrator for a single camera.
    Processes frames through the complete detection → tracking → geofence pipeline.
    """

    def __init__(self, camera_id: str, source: str = "synthetic"):
        self.camera_id = camera_id
        self.stream = StreamSimulator(source=source, camera_id=camera_id)
        self.enhancer = CLAHEEnhancer()
        self.detector = YOLODetector()
        self.tracker = ObjectTracker()
        self.geofence = GeofenceEngine()

        self.running = False
        self.fps = 0.0
        self._frame_times: list[float] = []
        self._breach_cooldown: dict[str, float] = {}  # zone_id+track_id -> last_alert_time
        self.seen_track_ids: set[int] = set()
        self.total_detections = 0
        self.active_breaches = 0
        self._latest_frame_index = -1
        self._latest_result = None

    def start(self):
        """Start the video stream."""
        self.stream.start()
        self.running = True

    def stop(self):
        """Stop the video stream."""
        self.running = False
        self.stream.stop()

    def process_frame(self) -> Optional[dict]:
        """
        Process a single frame through the complete pipeline.
        Returns a dict with frame bytes, detections, and breach events.
        """
        if not self.running:
            return None

        current_idx = self.stream.frame_count
        if current_idx == self._latest_frame_index and self._latest_result is not None:
            res = self._latest_result.copy()
            res["breach_events"] = []
            return res

        frame = self.stream.get_frame()
        if frame is None:
            return None

        # Track FPS
        now = time.time()
        self._frame_times.append(now)
        self._frame_times = [t for t in self._frame_times if now - t < 1.0]
        self.fps = len(self._frame_times)

        # 1. Enhance (CLAHE)
        enhanced = self.enhancer.enhance(frame)

        # 2. Detect
        detections = self.detector.detect(enhanced)
        for det in detections:
            if det.track_id > 0:
                self.seen_track_ids.add(det.track_id)
        self.total_detections = max(len(self.seen_track_ids), len(detections))

        # 3. Track
        tracked_objects = self.tracker.update(detections)

        # 4. Geofence check
        breach_events = self.geofence.check_detections(detections)

        # Filter breach events with cooldown (don't spam alerts)
        filtered_breaches = []
        for breach in breach_events:
            key = f"{breach.zone_id}:{breach.detection.track_id}"
            last_alert = self._breach_cooldown.get(key, 0)
            if now - last_alert > 5.0:  # 5-second cooldown per zone+track combo
                self._breach_cooldown[key] = now
                filtered_breaches.append(breach)

        self.active_breaches = len(filtered_breaches)

        # 5. Annotate frame
        annotated = self._annotate_frame(enhanced, detections, filtered_breaches)

        # 6. Encode to JPEG
        if HAS_CV2:
            _, jpeg_buf = cv2.imencode('.jpg', annotated, [cv2.IMWRITE_JPEG_QUALITY, 75])
            frame_bytes = jpeg_buf.tobytes()
        else:
            # Fallback: raw frame to bytes (less efficient)
            from PIL import Image
            img = Image.fromarray(annotated[:, :, ::-1] if len(annotated.shape) == 3 else annotated)
            buf = BytesIO()
            img.save(buf, format='JPEG', quality=75)
            frame_bytes = buf.getvalue()

        # 7. Build result
        result = {
            "frame_bytes": frame_bytes,
            "detections": [
                {
                    "bbox": list(d.bbox_norm),
                    "confidence": round(d.confidence, 3),
                    "object_class": d.category,
                    "track_id": d.track_id
                }
                for d in detections
            ],
            "breach_events": [
                {
                    "event_id": str(uuid.uuid4()),
                    "camera_id": self.camera_id,
                    "zone_id": b.zone_id,
                    "zone_label": b.zone_label,
                    "severity": b.severity,
                    "object_class": b.detection.category,
                    "object_id": b.detection.track_id,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "description": b.description
                }
                for b in filtered_breaches
            ],
            "fps": round(self.fps, 1),
            "clahe_enabled": self.enhancer.enabled
        }
        self._latest_frame_index = current_idx
        self._latest_result = result
        return result

    def _annotate_frame(self, frame: np.ndarray, detections: list[Detection], breaches: list[BreachEvent]) -> np.ndarray:
        """Draw detection boxes, zones, and breach indicators on the frame."""
        if not HAS_CV2:
            return frame

        annotated = frame.copy()
        h, w = annotated.shape[:2]

        # Draw zones
        for zone in self.geofence.zones.values():
            if not zone.is_active:
                continue

            # Parse color
            color_hex = zone.color.lstrip('#')
            try:
                r, g, b = int(color_hex[0:2], 16), int(color_hex[2:4], 16), int(color_hex[4:6], 16)
                color_bgr = (b, g, r)
            except (ValueError, IndexError):
                color_bgr = (0, 0, 255)

            pts = [(int(p[0] * w), int(p[1] * h)) for p in zone.coordinates]

            if zone.zone_type == "polygon" and len(pts) >= 3:
                pts_array = np.array(pts, np.int32)
                # Semi-transparent fill
                overlay = annotated.copy()
                cv2.fillPoly(overlay, [pts_array], color_bgr)
                cv2.addWeighted(overlay, 0.2, annotated, 0.8, 0, annotated)
                cv2.polylines(annotated, [pts_array], True, color_bgr, 2)
                # Label
                cv2.putText(annotated, zone.label, (pts[0][0], pts[0][1] - 5),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, color_bgr, 1, cv2.LINE_AA)

            elif zone.zone_type == "tripwire" and len(pts) >= 2:
                cv2.line(annotated, pts[0], pts[1], color_bgr, 2, cv2.LINE_AA)
                # Dashed effect
                mid = ((pts[0][0] + pts[1][0]) // 2, (pts[0][1] + pts[1][1]) // 2)
                cv2.putText(annotated, zone.label, (mid[0] - 20, mid[1] - 10),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.45, color_bgr, 1, cv2.LINE_AA)

        # Draw detection bounding boxes
        category_colors = {
            "human": (0, 200, 255),    # Amber
            "vehicle": (255, 140, 50),  # Blue
            "wildlife": (50, 220, 50),  # Green
        }

        for det in detections:
            x1, y1, x2, y2 = det.bbox
            color = category_colors.get(det.category, (200, 200, 200))

            cv2.rectangle(annotated, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)

            label = f"{det.category} #{det.track_id} {det.confidence:.0%}"
            label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.4, 1)[0]
            cv2.rectangle(annotated,
                         (int(x1), int(y1) - label_size[1] - 6),
                         (int(x1) + label_size[0] + 4, int(y1)),
                         color, -1)
            cv2.putText(annotated, label, (int(x1) + 2, int(y1) - 4),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 0), 1, cv2.LINE_AA)

            # Draw centroid dot
            cx, cy = int(det.centroid[0] * w), int(det.centroid[1] * h)
            cv2.circle(annotated, (cx, cy), 3, color, -1)

        # Breach flash indicator
        if breaches:
            # Red border flash
            cv2.rectangle(annotated, (0, 0), (w - 1, h - 1), (0, 0, 255), 4)
            cv2.putText(annotated, "!! BREACH !!", (w // 2 - 60, 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2, cv2.LINE_AA)

        return annotated

    def save_snapshot(self, frame_bytes: bytes, event_id: str) -> str:
        """Save a breach snapshot to disk."""
        filename = f"{event_id}.jpg"
        filepath = settings.SNAPSHOT_DIR / filename
        with open(filepath, 'wb') as f:
            f.write(frame_bytes)
        return str(filepath)

    def update_zones(self, zones_data: list[dict]):
        """Reload zone configurations."""
        self.geofence.load_zones(zones_data)


class PipelineManager:
    """Manages multiple camera pipelines."""

    def __init__(self):
        self.pipelines: dict[str, VisionPipeline] = {}
        self._start_time = time.time()

    def create_pipeline(self, camera_id: str, source: str = "synthetic") -> VisionPipeline:
        """Create and register a new vision pipeline for a camera."""
        pipeline = VisionPipeline(camera_id=camera_id, source=source)
        self.pipelines[camera_id] = pipeline
        return pipeline

    def get_pipeline(self, camera_id: str) -> Optional[VisionPipeline]:
        """Get an existing pipeline by camera ID."""
        return self.pipelines.get(camera_id)

    def start_all(self):
        """Start all registered pipelines."""
        for pipeline in self.pipelines.values():
            pipeline.start()

    def stop_all(self):
        """Stop all registered pipelines."""
        for pipeline in self.pipelines.values():
            pipeline.stop()

    @property
    def uptime(self) -> float:
        return time.time() - self._start_time

    @property
    def total_detections(self) -> int:
        return sum(p.total_detections for p in self.pipelines.values())

    @property
    def active_breaches(self) -> int:
        return sum(p.active_breaches for p in self.pipelines.values())
