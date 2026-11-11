@echo off
title BeSmart Frontend (React + Vite - Port 5173)
cd /d "%~dp0frontend"
if not exist "node_modules" (
    echo [INFO] Folder node_modules belum ada, menjalankan npm install...
    call npm install
)
echo Menjalankan Frontend BeSmart di http://localhost:5173 ...
echo Tekan Ctrl+C untuk menghentikan server.
echo.
call npm run dev
echo.
echo Server frontend berhenti (kode keluar: %ERRORLEVEL%).
pause
