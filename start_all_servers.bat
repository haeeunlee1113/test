@echo off
echo ====================================
echo 서버 시작 중...
echo ====================================
echo.

cd /d "%~dp0"

echo 백엔드 서버 시작 중...
start "Backend Server" cmd /k "cd test-cursor-build-code-from-scratch-93e2\backend && python run.py"

timeout /t 2 /nobreak >nul

echo 프론트엔드 서버 시작 중...
start "Frontend Server" cmd /k "cd test-cursor-build-code-from-scratch-93e2\frontend && python server.py"

echo.
echo ====================================
echo 서버가 시작되었습니다!
echo ====================================
echo 백엔드: http://localhost:5000
echo 프론트엔드: http://localhost:3000
echo.
echo 서버를 종료하려면 각 창을 닫으세요.
pause


