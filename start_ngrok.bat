@echo off
echo ========================================
echo Ngrok 터널링 시작
echo ========================================
echo.
echo 프론트엔드(3000)와 백엔드(5000) 모두 터널링합니다.
echo.
echo 주의: ngrok이 설치되어 있어야 합니다.
echo 다운로드: https://ngrok.com/download
echo.
echo 백엔드 터널을 시작합니다...
start cmd /k "ngrok http 5000"
timeout /t 2 /nobreak >nul
echo.
echo 프론트엔드 터널을 시작합니다...
start cmd /k "ngrok http 3000"
echo.
echo ========================================
echo 두 개의 ngrok 창이 열렸습니다.
echo 각 창에서 생성된 URL을 확인하세요.
echo 예: https://xxxx-xx-xx-xx-xx.ngrok-free.app
echo ========================================
pause






