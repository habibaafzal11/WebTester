@echo off
echo.
echo  ==========================================
echo   WebTester Pro - Starting Backend Server
echo  ==========================================
echo.

cd /d "%~dp0backend"

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: Node.js is not installed!
    echo  Please download it from: https://nodejs.org
    echo  Install the LTS version, then run this file again.
    pause
    exit /b 1
)

echo  Node.js found: 
node --version

if not exist "node_modules" (
    echo.
    echo  Installing dependencies for the first time...
    echo  This will take 1-2 minutes, please wait...
    npm install
    echo.
    echo  Installing Playwright browser ^(headless Chrome^)...
    npx playwright install chromium
)

echo.
echo  ==========================================
echo   Server running at http://localhost:3847
echo   Keep this window open while testing!
echo   Press Ctrl+C to stop the server.
echo  ==========================================
echo.

node src/server.js
pause
