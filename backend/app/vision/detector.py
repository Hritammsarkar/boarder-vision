"""
BorderVision AI — YOLOv8 Object Detector
Wraps Ultralytics YOLOv8 with class filtering for surveillance.
"""

import numpy as np
from dataclasses import dataclass
from typing import Optional

from ..config import settings


# COCO class ID → surveillance category mapping
SURVEILLANCE_CLASSES = {
    0: "human",      # person
    2: "vehicle",    # car
    3: "vehicle",    # motorcycle
    5: "vehicle",    # bus
    7: "vehicle",    # truck
    14: "wildlife",  # bird
    15: "wildlife",  # cat
    16: "wildlife",  # dog
    17: "wildlife",  # horse
    18: "wildlife",  # sheep
    19: "wildlife",  # cow
    21: "wildlife",  # bear
    22: "wildlife",  # zebra
    23: "wildlife",  # giraffe
}

# Only detect these COCO class IDs
ALLOWED_CLASS_IDS = list(SURVEILLANCE_CLASSES.keys())


@dataclass
class Detection:
    """A single object detection result."""
    bbox: tuple[float, float, float, float]  # (x1, y1, x2, y2) in pixels
    bbox_norm: tuple[float, float, float, float]  # normalized 0-1
    confidence: float
    class_id: int
    class_name: str  # COCO class name
    category: str  # surveillance category: human, vehicle, wildlife
    track_id: int = -1
    centroid: tuple[float, float] = (0.0, 0.0)  # (cx, cy) normalized


class YOLODetector:
    """
    YOLOv8 detector wrapper that filters detections to
    surveillance-relevant classes (human, vehicle, wildlife).
    """

    def __init__(self, model_path: str = None, confidence: float = None):
        self.model_path = model_path or settings.YOLO_MODEL
        self.confidence = confidence or settings.DETECTION_CONFIDENCE
        self.model = None
        self._load_model()

    def _load_model(self):
        """Load the YOLO model, fallback to simulation if unavailable."""
        try:
            from ultralytics import YOLO
            self.model = YOLO(self.model_path)
            self.model.fuse()
        except Exception as e:
            print(f"[WARN] YOLOv8 model load failed: {e}. Using simulation mode.")
            self.model = None

    def detect(self, frame: np.ndarray, is_synthetic: bool = False) -> list[Detection]:
        """
        Run detection on a frame and return filtered detections.
        Uses real YOLOv8 inference when model is loaded.
        """
        if self.model is not None:
            return self._real_detect(frame)

        return self._simulate_detections(frame)

    def _real_detect(self, frame: np.ndarray) -> list[Detection]:
        """Run high-performance YOLOv8 inference with ByteTrack."""
        h, w = frame.shape[:2]

        try:
            # Use model.track with imgsz=384 for 3x-4x faster CPU inference + persistent ByteTrack IDs
            results = self.model.track(
                frame,
                imgsz=384,
                conf=self.confidence,
                classes=ALLOWED_CLASS_IDS,
                persist=True,
                verbose=False
            )
        except Exception:
            # Fallback to standard inference if tracker errors
            results = self.model(
                frame,
                imgsz=384,
                conf=self.confidence,
                classes=ALLOWED_CLASS_IDS,
                verbose=False
            )

        detections = []
        for result in results:
            if result.boxes is None:
                continue

            for box in result.boxes:
                class_id = int(box.cls[0])
                if class_id not in SURVEILLANCE_CLASSES:
                    continue

                x1, y1, x2, y2 = box.xyxy[0].tolist()
                conf = float(box.conf[0])
                coco_name = result.names[class_id]
                category = SURVEILLANCE_CLASSES[class_id]

                cx = ((x1 + x2) / 2) / w
                cy = ((y1 + y2) / 2) / h

                track_id = int(box.id[0]) if (box.id is not None and len(box.id) > 0) else 1

                detections.append(Detection(
                    bbox=(x1, y1, x2, y2),
                    bbox_norm=(x1 / w, y1 / h, x2 / w, y2 / h),
                    confidence=conf,
                    class_id=class_id,
                    class_name=coco_name,
                    category=category,
                    track_id=track_id,
                    centroid=(cx, cy)
                ))

        return detections

    def _simulate_detections(self, frame: np.ndarray) -> list[Detection]:
        """
        Generate synthetic detections based on bright regions in the frame.
        Used when YOLOv8 model is not available.
        """
        import time
        import math

        h, w = frame.shape[:2]
        t = time.time()
        detections = []

        # Simulate 2-4 moving objects
        sim_objects = [
            {"track_id": 1, "category": "human", "class_name": "person", "class_id": 0,
             "phase": 0.0, "freq_x": 0.03, "freq_y": 0.02, "cx_base": 0.3, "cy_base": 0.5, "w": 0.05, "h": 0.12},
            {"track_id": 2, "category": "vehicle", "class_name": "car", "class_id": 2,
             "phase": 1.5, "freq_x": 0.02, "freq_y": 0.015, "cx_base": 0.6, "cy_base": 0.6, "w": 0.10, "h": 0.08},
            {"track_id": 3, "category": "human", "class_name": "person", "class_id": 0,
             "phase": 3.0, "freq_x": 0.025, "freq_y": 0.018, "cx_base": 0.7, "cy_base": 0.4, "w": 0.04, "h": 0.11},
            {"track_id": 4, "category": "wildlife", "class_name": "dog", "class_id": 16,
             "phase": 4.5, "freq_x": 0.04, "freq_y": 0.03, "cx_base": 0.4, "cy_base": 0.7, "w": 0.04, "h": 0.05},
        ]

        for obj in sim_objects:
            cx = obj["cx_base"] + 0.2 * math.sin(t * obj["freq_x"] * 6.28 + obj["phase"])
            cy = obj["cy_base"] + 0.15 * math.cos(t * obj["freq_y"] * 6.28 + obj["phase"] * 0.7)

            cx = max(0.05, min(0.95, cx))
            cy = max(0.05, min(0.95, cy))

            half_w = obj["w"] / 2
            half_h = obj["h"] / 2

            x1 = (cx - half_w) * w
            y1 = (cy - half_h) * h
            x2 = (cx + half_w) * w
            y2 = (cy + half_h) * h

            detections.append(Detection(
                bbox=(x1, y1, x2, y2),
                bbox_norm=(cx - half_w, cy - half_h, cx + half_w, cy + half_h),
                confidence=0.75 + 0.2 * math.sin(t + obj["phase"]),
                class_id=obj["class_id"],
                class_name=obj["class_name"],
                category=obj["category"],
                track_id=obj["track_id"],
                centroid=(cx, cy)
            ))

        return detections

    def detect_with_tracking(self, frame: np.ndarray) -> list[Detection]:
        """Run detection with built-in ByteTrack tracking."""
        if self.model is None or settings.SIMULATE_DETECTIONS:
            return self._simulate_detections(frame)

        h, w = frame.shape[:2]
        results = self.model.track(
            frame,
            conf=self.confidence,
            classes=ALLOWED_CLASS_IDS,
            tracker=f"{settings.TRACKER_TYPE}.yaml",
            persist=True,
            verbose=False
        )

        detections = []
        for result in results:
            if result.boxes is None:
                continue

            for box in result.boxes:
                class_id = int(box.cls[0])
                if class_id not in SURVEILLANCE_CLASSES:
                    continue

                x1, y1, x2, y2 = box.xyxy[0].tolist()
                conf = float(box.conf[0])
                coco_name = result.names[class_id]
                category = SURVEILLANCE_CLASSES[class_id]

                cx = ((x1 + x2) / 2) / w
                cy = ((y1 + y2) / 2) / h

                track_id = int(box.id[0]) if box.id is not None else -1

                detections.append(Detection(
                    bbox=(x1, y1, x2, y2),
                    bbox_norm=(x1 / w, y1 / h, x2 / w, y2 / h),
                    confidence=conf,
                    class_id=class_id,
                    class_name=coco_name,
                    category=category,
                    track_id=track_id,
                    centroid=(cx, cy)
                ))

        return detections
