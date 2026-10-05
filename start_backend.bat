@echo off
title Spatial Learning Platform - Backend
cd /d "%~dp0backend"
echo ========================================================
echo  Starting FastAPI Backend Server (Port 8000)
echo ========================================================
set "PY_EXE="
if exist "venv\Scripts\python.exe" set "PY_EXE=venv\Scripts\python.exe"
if exist "spatial\Scripts\python.exe" set "PY_EXE=spatial\Scripts\python.exe"

if "%PY_EXE%"=="" (
    echo [ERROR] Virtual environment not found in backend\venv or backend\spatial.
    echo Please create it or install dependencies.
    pause
    exit /b 1
)
%PY_EXE% -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause
