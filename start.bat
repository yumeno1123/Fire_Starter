@echo off
title FLCL: Fire Starter
cd /d "%~dp0"

echo ========================================================
echo   FLCL: Fire Starter Launcher
echo ========================================================
echo.

where node >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo Starting server with Node.js...
    node server.js
    goto end
)

where python >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo Node.js not detected. Starting with Python...
    start "" "http://localhost:8080"
    python -m http.server 8080
    goto end
)

echo.
echo [ERROR] Neither Node.js nor Python was found on this system.
echo Please install Node.js or Python to run Fire Starter.
echo.
pause

:end
