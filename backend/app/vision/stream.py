"""
BorderVision AI — Video Stream Simulator
Handles MP4 file looping, webcam capture, and synthetic frame generation.
"""

import time
import threading
import math
import numpy as np

try:
    import cv2
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False

from ..config import settings


class StreamSimulator:
    """
    Video ingestion source that can read from:
    - MP4 files (looped)
    - Webcam (device index)
    - Synthetic frames (generated procedurally)
    """

    def __init__(self, source: str = "synthetic", camera_id: str = "cam-0"):
        self.source = source
        self.camera_id = camera_id
        self.cap = None
        self.running = False
        self.frame = None
        self.lock = threading.Lock()
        self.fps = settings.SYNTHETIC_FPS
        self.frame_count = 0
        self._thread = None

    def start(self):
        """Start the frame capture loop in a background thread."""
        if self.running:
            return
        self.running = True

        if self.source == "synthetic" or not HAS_CV2:
            self._thread = threading.Thread(target=self._synthetic_loop, daemon=True)
        elif self.source == "webcam":
            # On Windows, CAP_DSHOW initializes webcams much faster and more reliably
            try:
                self.cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
                if not self.cap.isOpened():
                    self.cap = cv2.VideoCapture(0)
            except Exception:
                self.cap = cv2.VideoCapture(0)
            self._thread = threading.Thread(target=self._capture_loop, daemon=True)
        else:
            # Assume file path
            self.cap = cv2.VideoCapture(self.source)
            self._thread = threading.Thread(target=self._capture_loop, daemon=True)

        self._thread.start()

    def stop(self):
        """Stop the capture loop and release resources."""
        self.running = False
        if self._thread:
            self._thread.join(timeout=2)
        if self.cap and HAS_CV2:
            self.cap.release()

    def get_frame(self) -> np.ndarray | None:
        """Get the latest frame (thread-safe)."""
        with self.lock:
            return self.frame.copy() if self.frame is not None else None

    def _capture_loop(self):
        """Read frames from OpenCV VideoCapture (file or webcam)."""
        interval = 1.0 / self.fps
        while self.running and self.cap and self.cap.isOpened():
            start = time.time()
            ret, frame = self.cap.read()
            if not ret:
                # Loop video file
                self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue

            frame = cv2.resize(frame, (settings.FRAME_WIDTH, settings.FRAME_HEIGHT))
            with self.lock:
                self.frame = frame
                self.frame_count += 1

            elapsed = time.time() - start
            if elapsed < interval:
                time.sleep(interval - elapsed)

    def _synthetic_loop(self):
        """Generate synthetic surveillance-style frames with moving objects."""
        w, h = settings.FRAME_WIDTH, settings.FRAME_HEIGHT
        interval = 1.0 / self.fps

        # Simulated moving objects per camera
        cam_idx = hash(self.camera_id) % 4
        base_hue = [15, 25, 35, 45][cam_idx]  # Different tint per camera

        # Moving target params
        targets = [
            {"x": 100.0, "y": 200.0, "vx": 1.5, "vy": 0.8, "w": 30, "h": 60, "cls": "human"},
            {"x": 400.0, "y": 300.0, "vx": -2.0, "vy": 0.5, "w": 60, "h": 40, "cls": "vehicle"},
            {"x": 250.0, "y": 150.0, "vx": 0.7, "vy": -1.2, "w": 20, "h": 20, "cls": "wildlife"},
        ]

        while self.running:
            start = time.time()

            # Dark surveillance-style background with subtle noise
            frame = np.zeros((h, w, 3), dtype=np.uint8)

            # Add dark gradient background
            for row in range(h):
                intensity = int(20 + 15 * (row / h))
                frame[row, :] = [intensity + base_hue // 4, intensity + base_hue // 6, intensity]

            # Add noise for realism
            noise = np.random.randint(0, 12, (h, w, 3), dtype=np.uint8)
            frame = cv2.add(frame, noise) if HAS_CV2 else np.clip(frame.astype(int) + noise.astype(int), 0, 255).astype(np.uint8)

            # Draw grid lines (surveillance camera overlay)
            grid_color = (40, 50, 40)
            for gx in range(0, w, 80):
                frame[::2, gx] = grid_color
            for gy in range(0, h, 80):
                frame[gy, ::2] = grid_color

            # Animate and draw moving targets
            t = self.frame_count * 0.05
            for i, tgt in enumerate(targets):
                # Update position with bounce
                tgt["x"] += tgt["vx"]
                tgt["y"] += tgt["vy"]

                # Add sinusoidal movement
                ox = math.sin(t + i * 2.0) * 30
                oy = math.cos(t + i * 1.5) * 20

                dx = int(tgt["x"] + ox)
                dy = int(tgt["y"] + oy)

                # Bounce off walls
                if tgt["x"] < 10 or tgt["x"] > w - 70:
                    tgt["vx"] *= -1
                if tgt["y"] < 10 or tgt["y"] > h - 70:
                    tgt["vy"] *= -1

                tgt["x"] = max(10, min(w - 70, tgt["x"]))
                tgt["y"] = max(10, min(h - 70, tgt["y"]))

                tw, th = tgt["w"], tgt["h"]

                # Draw bounding box shape
                if tgt["cls"] == "human":
                    color = (0, 200, 255)  # Amber
                    # Draw a rough person silhouette
                    cx, cy = dx + tw // 2, dy + th // 2
                    frame[max(0,dy):min(h,dy+th), max(0,dx):min(w,dx+tw)] = np.clip(
                        frame[max(0,dy):min(h,dy+th), max(0,dx):min(w,dx+tw)].astype(int) + np.array(color) // 3, 0, 255
                    ).astype(np.uint8)
                elif tgt["cls"] == "vehicle":
                    color = (255, 100, 50)  # Blue
                    frame[max(0,dy):min(h,dy+th), max(0,dx):min(w,dx+tw)] = np.clip(
                        frame[max(0,dy):min(h,dy+th), max(0,dx):min(w,dx+tw)].astype(int) + np.array(color) // 3, 0, 255
                    ).astype(np.uint8)
                else:
                    color = (50, 255, 50)  # Green
                    frame[max(0,dy):min(h,dy+th), max(0,dx):min(w,dx+tw)] = np.clip(
                        frame[max(0,dy):min(h,dy+th), max(0,dx):min(w,dx+tw)].astype(int) + np.array(color) // 4, 0, 255
                    ).astype(np.uint8)

            # Camera overlay text
            timestamp_str = time.strftime("%Y-%m-%d %H:%M:%S")
            cam_label = f"CAM-{cam_idx + 1:02d}"

            # Draw timestamp bar at bottom
            frame[h-25:h, :] = (20, 20, 30)
            # Simple text rendering without cv2.putText
            self._draw_text_simple(frame, cam_label, 10, h - 8, (0, 255, 0))
            self._draw_text_simple(frame, timestamp_str, w - 200, h - 8, (200, 200, 200))

            # REC indicator (blinking)
            if self.frame_count % 30 < 20:
                frame[8:18, w-50:w-40] = (0, 0, 255)  # Red dot
                self._draw_text_simple(frame, "REC", w - 35, 16, (0, 0, 255))

            with self.lock:
                self.frame = frame
                self.frame_count += 1

            elapsed = time.time() - start
            if elapsed < interval:
                time.sleep(interval - elapsed)

    @staticmethod
    def _draw_text_simple(frame: np.ndarray, text: str, x: int, y: int, color: tuple):
        """Draw text on frame using cv2 if available, otherwise skip."""
        if HAS_CV2:
            cv2.putText(frame, text, (x, y), cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1, cv2.LINE_AA)
