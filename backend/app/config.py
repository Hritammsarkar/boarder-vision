"""
BorderVision AI — Application Configuration
Centralized settings with environment variable overrides.
"""

import os
from pathlib import Path


class Settings:
    """Application settings loaded from environment variables with sensible defaults."""

    # Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    VIDEO_DIR: Path = DATA_DIR / "videos"
    SNAPSHOT_DIR: Path = DATA_DIR / "snapshots"
    DATABASE_URL: str = f"sqlite+aiosqlite:///{DATA_DIR / 'bordervision.db'}"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Vision Pipeline
    YOLO_MODEL: str = "yolov8n.pt"
    DETECTION_CONFIDENCE: float = 0.4
    TRACKER_TYPE: str = "bytetrack"
    MAX_FPS: int = 15
    FRAME_WIDTH: int = 640
    FRAME_HEIGHT: int = 480

    # CLAHE Enhancement
    CLAHE_ENABLED: bool = True
    CLAHE_CLIP_LIMIT: float = 3.0
    CLAHE_GRID_SIZE: tuple[int, int] = (8, 8)

    # Simulation
    SIMULATE_DETECTIONS: bool = True  # Use synthetic detections when YOLO unavailable
    NUM_SIMULATED_CAMERAS: int = 4
    SYNTHETIC_FPS: int = 12

    def __init__(self):
        """Override defaults from environment variables."""
        self.DATABASE_URL = os.getenv("BV_DATABASE_URL", self.DATABASE_URL)
        self.YOLO_MODEL = os.getenv("BV_YOLO_MODEL", self.YOLO_MODEL)
        self.DETECTION_CONFIDENCE = float(os.getenv("BV_CONFIDENCE", str(self.DETECTION_CONFIDENCE)))
        self.CLAHE_ENABLED = os.getenv("BV_CLAHE", "true").lower() == "true"
        self.MAX_FPS = int(os.getenv("BV_MAX_FPS", str(self.MAX_FPS)))
        self.SIMULATE_DETECTIONS = os.getenv("BV_SIMULATE", "true").lower() == "true"
        self.HOST = os.getenv("BV_HOST", self.HOST)
        self.PORT = int(os.getenv("BV_PORT", str(self.PORT)))

        # Ensure directories exist
        self.DATA_DIR.mkdir(parents=True, exist_ok=True)
        self.VIDEO_DIR.mkdir(parents=True, exist_ok=True)
        self.SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)


settings = Settings()
