# BorderVision AI

> AI-Powered Border Surveillance & Video Analytics Platform

A production-ready, full-stack platform for real-time video analytics with AI-powered object detection, geofencing, and tactical mapping — designed for legacy CCTV infrastructure.

## Features

- **🎥 Multi-Camera Live Grid** — 4 simultaneous camera feeds with WebSocket streaming
- **🤖 AI Detection Pipeline** — YOLOv8 object detection with ByteTrack tracking
- **⬡ Interactive Geofencing** — Draw polygons (Red Zones) and tripwire lines on canvas
- **⚡ Tripwire Detection** — Cross-product CCW algorithm for line-crossing alerts
- **🗺️ Tactical GIS Map** — Leaflet map with camera FOV cones that pulse red during breaches
- **📡 Real-Time Incident Feed** — WebSocket event ticker with severity badges and audio siren
- **🔍 CLAHE Enhancement** — Low-light/legacy CCTV image enhancement toggle
- **📊 Event Audit Logs** — Filterable, paginated event history with CSV export
- **📸 Forensic Snapshots** — Automatic breach frame capture with metadata viewer

## Architecture

```
Frontend (Next.js 14)          Backend (FastAPI)
┌─────────────────┐           ┌──────────────────────┐
│ Dashboard UI    │◄──REST──►│ REST API (CRUD)      │
│ Canvas Overlay  │           │                      │
│ Tactical Map    │◄──WS────►│ WebSocket Server     │
│ Incident Feed   │           │                      │
└─────────────────┘           │ Vision Pipeline:     │
                              │  Stream Simulator    │
                              │  CLAHE Enhancer      │
                              │  YOLOv8 Detector     │
                              │  ByteTrack Tracker   │
                              │  Geofence Engine     │
                              │                      │
                              │ SQLite Database      │
                              └──────────────────────┘
```

## Quick Start

### Prerequisites
- **Python 3.10+** — [python.org](https://python.org)
- **Node.js 18+** — [nodejs.org](https://nodejs.org)

### One-Command Launch

**Windows:**
```batch
start.bat
```

**Linux/Mac:**
```bash
chmod +x run.sh && ./run.sh
```

### Manual Setup

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python run_backend.py
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Access
- **Dashboard:** http://localhost:3000
- **API Docs:** http://localhost:8000/docs

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Canvas | HTML5 Canvas API for geofencing overlay |
| Mapping | Leaflet (via React-Leaflet) with dark CartoDB tiles |
| Backend | Python, FastAPI, WebSockets |
| Vision | OpenCV, Ultralytics YOLOv8, ByteTrack |
| Database | SQLite (async via aiosqlite) |
| State | Real-time via WebSocket + REST API |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/cameras/` | List all cameras |
| POST | `/api/v1/cameras/` | Register new camera |
| GET | `/api/v1/zones/?camera_id=` | List zones for camera |
| POST | `/api/v1/zones/` | Create geofence/tripwire |
| DELETE | `/api/v1/zones/{id}` | Remove zone |
| GET | `/api/v1/events/` | Paginated event list |
| POST | `/api/v1/events/{id}/acknowledge` | Acknowledge event |
| GET | `/api/v1/events/export` | CSV export |
| GET | `/api/v1/stats` | System statistics |
| WS | `/ws/stream/{camera_id}` | Camera video stream |
| WS | `/ws/events` | Global event feed |

## Configuration

Environment variables (prefix `BV_`):

| Variable | Default | Description |
|----------|---------|-------------|
| `BV_YOLO_MODEL` | `yolov8n.pt` | YOLO model path |
| `BV_CONFIDENCE` | `0.4` | Detection confidence threshold |
| `BV_CLAHE` | `true` | Enable CLAHE enhancement |
| `BV_SIMULATE` | `true` | Use simulated detections |
| `BV_MAX_FPS` | `15` | Maximum stream FPS |
| `BV_PORT` | `8000` | Backend port |

## License

MIT
