@echo off
title BeSmart Backend (FastAPI - Port 8000)
cd /d "%~dp0backend"
if not exist ".venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment .venv tidak ditemukan di folder backend.
    pause
    exit /b 1
)
echo Menjalankan Backend FastAPI BeSmart di http://127.0.0.1:8000 ...
echo Tekan Ctrl+C untuk menghentikan server.
echo.
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
echo.
echo Server backend berhenti (kode keluar: %ERRORLEVEL%).
pause
