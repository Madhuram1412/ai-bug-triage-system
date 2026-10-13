@echo off
echo ========================================================
echo Starting AI Bug Triage System
echo ========================================================

if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
)

echo Starting FastAPI server at http://127.0.0.1:8001 ...
python -m backend.app.main
pause
