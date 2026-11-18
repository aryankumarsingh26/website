@echo off
title SnackVault Server Watchdog
cd /d "%~dp0"

:loop
echo [%date% %time%] Starting SnackVault Server... >> "%~dp0server.log"
.\.venv\Scripts\python.exe main.py >> "%~dp0server.log" 2>&1
echo [%date% %time%] Server stopped or crashed. Restarting in 3 seconds... >> "%~dp0server.log"
timeout /t 3 /nobreak >nul
goto loop
