"""
BorderVision AI — ByteTrack Integration
Object tracking wrapper using Ultralytics built-in tracker.
"""

from dataclasses import dataclass, field
from collections import defaultdict

from .detector import Detection


@dataclass
class TrackedObject:
    """A tracked object with centroid history."""
    track_id: int
    detections: list[Detection] = field(default_factory=list)
    centroid_history: list[tuple[float, float]] = field(default_factory=list)
    last_seen_frame: int = 0
    total_frames_tracked: int = 0

    @property
    def current_centroid(self) -> tuple[float, float]:
        if self.centroid_history:
            return self.centroid_history[-1]
        return (0.0, 0.0)

    @property
    def current_detection(self) -> Detection | None:
        return self.detections[-1] if self.detections else None

    @property
    def velocity(self) -> tuple[float, float]:
        """Compute velocity from last two centroids."""
        if len(self.centroid_history) < 2:
            return (0.0, 0.0)
        prev = self.centroid_history[-2]
        curr = self.centroid_history[-1]
        return (curr[0] - prev[0], curr[1] - prev[1])


class ObjectTracker:
    """
    Manages tracked objects across frames.
    Works with YOLOv8's built-in ByteTrack tracker
    or simulated track IDs.
    """

    def __init__(self, max_history: int = 60, stale_threshold: int = 30):
        self.tracks: dict[int, TrackedObject] = {}
        self.max_history = max_history
        self.stale_threshold = stale_threshold
        self.frame_count = 0

    def update(self, detections: list[Detection]) -> list[TrackedObject]:
        """
        Update tracked objects with new detections.
        Each detection should already have a track_id assigned
        by YOLOv8's ByteTrack or the simulator.
        """
        self.frame_count += 1
        active_track_ids = set()

        for det in detections:
            tid = det.track_id
            if tid < 0:
                continue

            active_track_ids.add(tid)

            if tid not in self.tracks:
                self.tracks[tid] = TrackedObject(track_id=tid)

            track = self.tracks[tid]
            track.detections.append(det)
            track.centroid_history.append(det.centroid)
            track.last_seen_frame = self.frame_count
            track.total_frames_tracked += 1

            # Trim history to prevent memory growth
            if len(track.centroid_history) > self.max_history:
                track.centroid_history = track.centroid_history[-self.max_history:]
                track.detections = track.detections[-self.max_history:]

        # Remove stale tracks
        stale_ids = [
            tid for tid, track in self.tracks.items()
            if self.frame_count - track.last_seen_frame > self.stale_threshold
        ]
        for tid in stale_ids:
            del self.tracks[tid]

        # Return currently active tracks
        return [self.tracks[tid] for tid in active_track_ids if tid in self.tracks]

    def get_active_tracks(self) -> list[TrackedObject]:
        """Get all currently active tracked objects."""
        return [
            track for track in self.tracks.values()
            if self.frame_count - track.last_seen_frame <= 5
        ]

    def reset(self):
        """Clear all tracking state."""
        self.tracks.clear()
        self.frame_count = 0
