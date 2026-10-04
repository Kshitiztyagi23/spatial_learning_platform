@echo off
title Spatial Learning Platform - Frontend
cd /d "%~dp0frontend"
echo ========================================================
echo  Starting Vite Frontend Server (Port 5173)
echo ========================================================
cmd.exe /c "npm run dev -- --host 127.0.0.1 --port 5173"
pause
