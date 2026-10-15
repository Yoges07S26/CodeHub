@echo off
title CodeHub Launcher
echo ====================================================
echo      Starting CodeHub Platform (Node + Express + MongoDB)
echo ====================================================

echo.
echo [1/2] Starting Unified Server (Web UI + REST API + MongoDB) on http://localhost:8000 ...
start "CodeHub Server (Port 8000)" cmd /k "cd /d ""%~dp0backend"" && node server.js"

timeout /t 2 /nobreak >nul

echo.
echo [2/2] Launching CodeHub in your default web browser ...
start http://localhost:8000

echo.
echo ====================================================
echo  CodeHub is running completely offline / local!
echo  - Unified Web App : http://localhost:8000
echo  - Backend REST API: http://localhost:8000/api
echo  - MongoDB Database: mongodb://127.0.0.1:27017/codehub
echo ====================================================
echo Close the server command window when you want to stop the server.
pause
