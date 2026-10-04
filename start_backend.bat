@echo off
title Spatial Learning Platform - Backend
cd /d "%~dp0backend"
echo ========================================================
echo  Starting FastAPI Backend Server (Port 8000)
echo ========================================================
if not exist "venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment not found in backend\venv.
    echo Please create it or install dependencies.
    pause
    exit /b 1
)
venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause
