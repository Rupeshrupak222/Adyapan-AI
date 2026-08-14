@echo off
echo === Adyapan AI - Piston Code Engine Setup ===
echo.

echo [1/4] Starting Piston container...
cd /d "%~dp0"
docker compose up -d

echo [2/4] Waiting for Piston API to be ready...
timeout /t 10 /nobreak >nul

:WAIT_LOOP
curl -s http://localhost:2000/api/v2/runtimes >nul 2>&1
if %errorlevel% neq 0 (
    echo   Waiting...
    timeout /t 3 /nobreak >nul
    goto WAIT_LOOP
)
echo   API is ready!

echo [3/4] Installing language runtimes...
echo   Installing Python 3.10.0...
curl -s -X POST http://localhost:2000/api/v2/packages -H "Content-Type: application/json" -d "{\"language\":\"python\",\"version\":\"3.10.0\"}" >nul

echo   Installing Node.js 18.15.0...
curl -s -X POST http://localhost:2000/api/v2/packages -H "Content-Type: application/json" -d "{\"language\":\"node\",\"version\":\"18.15.0\"}" >nul

echo   Installing C++ 10.2.0...
curl -s -X POST http://localhost:2000/api/v2/packages -H "Content-Type: application/json" -d "{\"language\":\"gcc\",\"version\":\"10.2.0\"}" >nul

echo   Installing Java 15.0.2...
curl -s -X POST http://localhost:2000/api/v2/packages -H "Content-Type: application/json" -d "{\"language\":\"java\",\"version\":\"15.0.2\"}" >nul

echo [4/4] Verifying installed runtimes...
curl -s http://localhost:2000/api/v2/runtimes

echo.
echo === Piston is running at http://localhost:2000 ===
echo === PISTON_URL in backend/.env should be: http://localhost:2000 ===
