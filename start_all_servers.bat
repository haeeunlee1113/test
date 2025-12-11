@echo off
chcp 65001 >nul
echo ====================================
echo Server Starting...
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

echo Python command: %PYTHON_CMD%
echo.

echo Starting backend server...
start "Backend Server" cmd /k "cd /d %~dp0backend && %PYTHON_CMD% run.py"

timeout /t 2 /nobreak >nul

echo Starting frontend server...
start "Frontend Server" cmd /k "cd /d %~dp0frontend && %PYTHON_CMD% server.py"

timeout /t 1 /nobreak >nul

echo.
echo ====================================
echo Servers started!
echo ====================================
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo If frontend does not start:
echo 1. Check error message in "Frontend Server" window
echo 2. Check if port 3000 is already in use
echo 3. Run manually: cd frontend then python server.py
echo.
echo Close each window to stop servers.
pause


