@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title AI Bug Triage System

echo ========================================================
echo       AI BUG TRIAGE SYSTEM - STARTING APPLICATION
echo ========================================================
echo.

set PYTHON_BIN="%~dp0venv\Scripts\python.exe"
if not exist %PYTHON_BIN% (
    set PYTHON_BIN=python
)

echo [1/2] Locating environment... OK
echo [2/2] Launching server & opening your web browser...
echo.
echo ========================================================
echo  Web URL : http://127.0.0.1:8000
echo  API Docs: http://127.0.0.1:8000/docs
echo ========================================================
echo.

:: Automatically open default web browser after 2 seconds
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://127.0.0.1:8000"

%PYTHON_BIN% -m backend.app.main

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] The application stopped unexpectedly with code %ERRORLEVEL%.
    pause
)
