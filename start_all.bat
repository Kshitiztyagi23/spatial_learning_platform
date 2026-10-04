@echo off
title Spatial Learning Platform Launcher
echo ========================================================
echo  Launching Adaptive Spatial Learning Platform
echo ========================================================
echo.
echo Starting Backend in a new window...
start "Backend (FastAPI)" cmd /k "%~dp0start_backend.bat"

echo Starting Frontend in a new window...
start "Frontend (Vite)" cmd /k "%~dp0start_frontend.bat"

echo.
echo Waiting 3 seconds for servers to initialize...
timeout /t 3 /nobreak > nul

echo Opening browser at http://127.0.0.1:5173/ ...
start http://127.0.0.1:5173/

echo.
echo Platform is running!
echo You can keep this window closed or minimized.
