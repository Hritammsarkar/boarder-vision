@echo off
title BorderVision AI — Launcher
echo ============================================================
echo   BORDERVISION AI — Unified Launcher
echo ============================================================
echo.

:: Check prerequisites — try py launcher first (handles Windows Store alias)
set "PYTHON_CMD="
where py >nul 2>&1 && set "PYTHON_CMD=py -3"
if not defined PYTHON_CMD (
    where python3 >nul 2>&1 && set "PYTHON_CMD=python3"
)
if not defined PYTHON_CMD (
    python --version >nul 2>&1 && set "PYTHON_CMD=python"
)
if not defined PYTHON_CMD (
    echo [ERROR] Python is not installed or not in PATH.
    echo Please install Python 3.10+ from https://python.org
    pause
    exit /b 1
)

where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

echo [*] Prerequisites OK
echo.

:: Setup Python virtual environment
if not exist "backend\venv" (
    echo [*] Creating Python virtual environment...
    %PYTHON_CMD% -m venv backend\venv
)

:: Activate venv and install dependencies
echo [*] Installing Python dependencies...
call backend\venv\Scripts\activate.bat
pip install -r backend\requirements.txt --quiet 2>nul
if %ERRORLEVEL% neq 0 (
    %PYTHON_CMD% -m pip install -r backend\requirements.txt --quiet 2>nul
)
echo [+] Python dependencies installed

:: Install frontend dependencies
if not exist "frontend\node_modules" (
    echo [*] Installing frontend dependencies...
    cd frontend
    call npm install --silent 2>nul
    cd ..
)
echo [+] Frontend dependencies ready

echo.
echo ============================================================
echo   Starting Services...
echo ============================================================
echo.

:: Start backend
echo [*] Starting FastAPI backend on http://localhost:8000
start "BorderVision Backend" cmd /c "cd backend && ..\backend\venv\Scripts\python.exe run_backend.py"

:: Wait for backend to initialize
timeout /t 3 /nobreak >nul

:: Start frontend
echo [*] Starting Next.js frontend on http://localhost:3000
start "BorderVision Frontend" cmd /c "cd frontend && npm run dev"

:: Wait and open browser
timeout /t 5 /nobreak >nul
echo.
echo [+] Opening dashboard in browser...
start http://localhost:3000

echo.
echo ============================================================
echo   BorderVision AI is running!
echo.
echo   Dashboard: http://localhost:3000
echo   API Docs:  http://localhost:8000/docs
echo.
echo   Press any key to stop all services...
echo ============================================================
pause >nul

:: Cleanup
echo [*] Stopping services...
taskkill /fi "WINDOWTITLE eq BorderVision Backend" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq BorderVision Frontend" /f >nul 2>&1
echo [+] All services stopped.
