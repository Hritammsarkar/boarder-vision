"""
BorderVision AI — CLAHE Low-Light Enhancement
Applies Contrast Limited Adaptive Histogram Equalization for low-light/legacy CCTV feeds.
"""

import numpy as np

try:
    import cv2
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False

from ..config import settings


class CLAHEEnhancer:
    """
    Applies CLAHE enhancement to improve visibility in low-light
    or degraded surveillance footage from legacy CCTV systems.
    """

    def __init__(self, clip_limit: float = None, grid_size: tuple = None):
        self.clip_limit = clip_limit or settings.CLAHE_CLIP_LIMIT
        self.grid_size = grid_size or settings.CLAHE_GRID_SIZE
        self.enabled = settings.CLAHE_ENABLED

        if HAS_CV2:
            self.clahe = cv2.createCLAHE(
                clipLimit=self.clip_limit,
                tileGridSize=self.grid_size
            )
        else:
            self.clahe = None

    def enhance(self, frame: np.ndarray) -> np.ndarray:
        """
        Apply CLAHE enhancement to a BGR frame.
        
        Converts to LAB color space, applies CLAHE to the L (lightness)
        channel, then converts back to BGR.
        """
        if not self.enabled or not HAS_CV2 or self.clahe is None:
            return frame

        try:
            # Convert BGR to LAB color space
            lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)

            # Split channels
            l_channel, a_channel, b_channel = cv2.split(lab)

            # Apply CLAHE to lightness channel
            l_enhanced = self.clahe.apply(l_channel)

            # Merge channels back
            lab_enhanced = cv2.merge([l_enhanced, a_channel, b_channel])

            # Convert back to BGR
            enhanced = cv2.cvtColor(lab_enhanced, cv2.COLOR_LAB2BGR)
            return enhanced

        except Exception:
            # Fallback: return original frame on any error
            return frame

    def toggle(self, enabled: bool):
        """Toggle CLAHE enhancement on/off."""
        self.enabled = enabled

    def update_params(self, clip_limit: float = None, grid_size: tuple = None):
        """Update CLAHE parameters dynamically."""
        if clip_limit is not None:
            self.clip_limit = clip_limit
        if grid_size is not None:
            self.grid_size = grid_size

        if HAS_CV2:
            self.clahe = cv2.createCLAHE(
                clipLimit=self.clip_limit,
                tileGridSize=self.grid_size
            )
