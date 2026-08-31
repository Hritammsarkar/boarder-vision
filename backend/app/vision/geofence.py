"""
BorderVision AI — Geofence & Tripwire Engine
Line-intersection (CCW algorithm) and point-in-polygon (ray-casting) math.
"""

import json
import math
from dataclasses import dataclass, field
from typing import Optional

from .detector import Detection


@dataclass
class BreachEvent:
    """Result of a geofence/tripwire violation check."""
    zone_id: str
    zone_label: str
    zone_type: str  # polygon or tripwire
    severity: str  # critical, high, warning
    detection: Detection
    description: str


@dataclass
class ZoneConfig:
    """Parsed zone configuration for geometry checks."""
    id: str
    zone_type: str  # polygon or tripwire
    coordinates: list[tuple[float, float]]  # Normalized (0-1) coordinate pairs
    color: str = "#ff0000"
    label: str = "Zone"
    severity: str = "critical"
    is_active: bool = True


class GeofenceEngine:
    """
    Checks tracked object centroids against defined geofence polygons
    and tripwire lines to detect boundary violations.
    """

    def __init__(self):
        self.zones: dict[str, ZoneConfig] = {}
        # Track previous centroids per track_id for tripwire crossing detection
        self._prev_centroids: dict[int, tuple[float, float]] = {}

    def load_zones(self, zones_data: list[dict]):
        """Load zone configurations from database records."""
        self.zones.clear()
        for z in zones_data:
            try:
                coords = json.loads(z["coordinates"]) if isinstance(z["coordinates"], str) else z["coordinates"]
                self.zones[z["id"]] = ZoneConfig(
                    id=z["id"],
                    zone_type=z["zone_type"],
                    coordinates=[(float(p[0]), float(p[1])) for p in coords],
                    color=z.get("color", "#ff0000"),
                    label=z.get("label", "Zone"),
                    severity=z.get("severity", "critical"),
                    is_active=z.get("is_active", True)
                )
            except (json.JSONDecodeError, KeyError, IndexError):
                continue

    def check_detections(self, detections: list[Detection]) -> list[BreachEvent]:
        """
        Check all detections against all active zones.
        Returns a list of breach events for violations found.
        """
        breaches = []

        for det in detections:
            cx, cy = det.centroid

            for zone in self.zones.values():
                if not zone.is_active:
                    continue

                if zone.zone_type == "polygon":
                    if self._point_in_polygon(cx, cy, zone.coordinates):
                        breaches.append(BreachEvent(
                            zone_id=zone.id,
                            zone_label=zone.label,
                            zone_type="polygon",
                            severity=zone.severity,
                            detection=det,
                            description=f"{det.category.title()} ({det.class_name}) detected inside {zone.label}"
                        ))

                elif zone.zone_type == "tripwire":
                    if len(zone.coordinates) >= 2:
                        prev = self._prev_centroids.get(det.track_id)
                        if prev is not None:
                            if self._line_segments_intersect(
                                prev[0], prev[1], cx, cy,
                                zone.coordinates[0][0], zone.coordinates[0][1],
                                zone.coordinates[1][0], zone.coordinates[1][1]
                            ):
                                breaches.append(BreachEvent(
                                    zone_id=zone.id,
                                    zone_label=zone.label,
                                    zone_type="tripwire",
                                    severity=zone.severity,
                                    detection=det,
                                    description=f"{det.category.title()} ({det.class_name}) crossed tripwire {zone.label}"
                                ))

            # Update previous centroid for tripwire tracking
            if det.track_id >= 0:
                self._prev_centroids[det.track_id] = (cx, cy)

        # Clean up stale track IDs (keep last 200)
        if len(self._prev_centroids) > 200:
            track_ids = sorted(self._prev_centroids.keys())
            for tid in track_ids[:-100]:
                del self._prev_centroids[tid]

        return breaches

    @staticmethod
    def _point_in_polygon(px: float, py: float, polygon: list[tuple[float, float]]) -> bool:
        """
        Ray-casting algorithm for point-in-polygon test.
        Casts a ray from the point to the right and counts edge crossings.
        Odd crossings = inside, even = outside.
        """
        n = len(polygon)
        if n < 3:
            return False

        inside = False
        j = n - 1

        for i in range(n):
            xi, yi = polygon[i]
            xj, yj = polygon[j]

            # Check if ray from (px, py) going right crosses edge (i, j)
            if ((yi > py) != (yj > py)) and (px < (xj - xi) * (py - yi) / (yj - yi) + xi):
                inside = not inside

            j = i

        return inside

    @staticmethod
    def _ccw(ax: float, ay: float, bx: float, by: float, cx: float, cy: float) -> bool:
        """
        Check if three points are in counter-clockwise order.
        Uses the cross-product of vectors AB and AC.
        """
        return (cy - ay) * (bx - ax) > (by - ay) * (cx - ax)

    @classmethod
    def _line_segments_intersect(
        cls,
        ax: float, ay: float, bx: float, by: float,
        cx: float, cy: float, dx: float, dy: float
    ) -> bool:
        """
        Check if line segment AB intersects line segment CD.
        Uses the CCW (counter-clockwise) orientation test.
        
        Two segments intersect iff:
        - A and B are on opposite sides of line CD, AND
        - C and D are on opposite sides of line AB
        """
        return (
            cls._ccw(ax, ay, cx, cy, dx, dy) != cls._ccw(bx, by, cx, cy, dx, dy)
            and
            cls._ccw(ax, ay, bx, by, cx, cy) != cls._ccw(ax, ay, bx, by, dx, dy)
        )

    @staticmethod
    def compute_centroid_from_bbox(bbox_norm: tuple[float, float, float, float]) -> tuple[float, float]:
        """Compute centroid from normalized bounding box."""
        x1, y1, x2, y2 = bbox_norm
        return ((x1 + x2) / 2, (y1 + y2) / 2)
