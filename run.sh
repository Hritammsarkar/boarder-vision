#!/usr/bin/env bash
set -e

echo "============================================================"
echo "  BORDERVISION AI — Unified Launcher"
echo "============================================================"
echo ""

# Check prerequisites
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python 3 is not installed."
    echo "Please install Python 3.10+ from https://python.org"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed."
    echo "Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

echo "[✓] Prerequisites OK"
echo ""

# Setup Python virtual environment
if [ ! -d "backend/venv" ]; then
    echo "[*] Creating Python virtual environment..."
    python3 -m venv backend/venv
fi

# Install Python dependencies
echo "[*] Installing Python dependencies..."
source backend/venv/bin/activate
pip install -r backend/requirements.txt --quiet
echo "[✓] Python dependencies installed"

# Install frontend dependencies
if [ ! -d "frontend/node_modules" ]; then
    echo "[*] Installing frontend dependencies..."
    cd frontend && npm install --silent && cd ..
fi
echo "[✓] Frontend dependencies ready"

echo ""
echo "============================================================"
echo "  Starting Services..."
echo "============================================================"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "[*] Stopping services..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo "[✓] All services stopped."
    exit 0
}
trap cleanup SIGINT SIGTERM

# Start backend
echo "[*] Starting FastAPI backend on http://localhost:8000"
cd backend && python run_backend.py &
BACKEND_PID=$!
cd ..

sleep 3

# Start frontend
echo "[*] Starting Next.js frontend on http://localhost:3000"
cd frontend && npm run dev &
FRONTEND_PID=$!
cd ..

sleep 3

echo ""
echo "============================================================"
echo "  BorderVision AI is running!"
echo ""
echo "  Dashboard: http://localhost:3000"
echo "  API Docs:  http://localhost:8000/docs"
echo ""
echo "  Press Ctrl+C to stop all services..."
echo "============================================================"

# Wait for either process to exit
wait
