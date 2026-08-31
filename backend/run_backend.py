"""
BorderVision AI — Backend Launcher
Run with: python run_backend.py
"""

import uvicorn
from app.config import settings

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=False,
        log_level="info",
        ws_max_size=16777216,  # 16MB max WebSocket message size
    )
