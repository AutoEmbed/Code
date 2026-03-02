@echo off
chcp 65001 >nul
echo ============================================
echo   AutoEmbed GUI - Windows Setup
echo ============================================
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found!
    echo Please install Python 3.10+ from https://www.python.org/downloads/
    echo IMPORTANT: Check "Add Python to PATH" during installation!
    pause
    exit /b 1
)

echo [OK] Python found
python --version

:: Install Python dependencies
echo.
echo Installing Python dependencies...
cd /d "%~dp0..\backend"
pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install Python dependencies
    pause
    exit /b 1
)
echo [OK] Python dependencies installed

:: Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] Node.js not found!
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js found
node --version

:: Install Node dependencies
echo.
echo Installing Node.js dependencies (this may take a few minutes)...
cd /d "%~dp0.."
npm install
if errorlevel 1 (
    echo [ERROR] Failed to install Node.js dependencies
    pause
    exit /b 1
)
echo [OK] Node.js dependencies installed

echo.
echo ============================================
echo   Setup Complete!
echo   Run start.bat to launch AutoEmbed GUI
echo ============================================
pause
