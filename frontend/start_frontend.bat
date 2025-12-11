@echo off
chcp 65001 >nul
echo ====================================
echo Starting Frontend Server...
echo ====================================
echo.

cd /d "%~dp0"

REM Python path check
where python >nul 2>&1
if %errorlevel% neq 0 (
    where python3 >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERROR] Python is not installed!
        echo Please install Python or add it to PATH.
        pause
        exit /b 1
    ) else (
        set PYTHON_CMD=python3
    )
) else (
    set PYTHON_CMD=python
)

echo Current directory: %CD%
echo Python command: %PYTHON_CMD%
echo.

echo Starting frontend server...
echo Port: 3000
echo.

%PYTHON_CMD% server.py

if errorlevel 1 (
    echo.
    echo [ERROR] Frontend server failed to start!
    echo.
    echo Possible causes:
    echo 1. Port 3000 is already in use
    echo 2. Python modules are not installed
    echo 3. There is a problem with server.py file
    echo.
    pause
)

