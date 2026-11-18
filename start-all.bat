@echo off
chcp 65001 >nul
title Multilingual AI Narration - Khoi dong he thong

echo =====================================================================
echo          HE THONG THUYET MINH BAO TANG DA NGON NGU AI
echo                  KHOI DONG TOAN BO PHAN HE
echo =====================================================================
echo.
echo Dang khoi chay 4 phan he trong cac cua so rieng biet...
echo.

set "ROOT_DIR=%~dp0"

start "1. Backend API (8080)" cmd /k "cd /d "%ROOT_DIR%backend" && echo [BACKEND API - Port 8080] && npm run dev"
timeout /t 3 /nobreak >nul

start "2. Customer Web (5173)" cmd /k "cd /d "%ROOT_DIR%frontend-web" && echo [CUSTOMER WEB - Port 5173] && npm run dev"
start "3. Admin Web (5174)" cmd /k "cd /d "%ROOT_DIR%admin-web" && echo [ADMIN WEB - Port 5174] && npm run dev"
start "4. Mobile Expo (8081)" cmd /k "cd /d "%ROOT_DIR%frontend-mobile" && echo [CUSTOMER MOBILE - Expo] && npx expo start"

echo.
echo =====================================================================
echo   [OK] DA MO THANH CONG 4 CUA SO DICH VU:
echo =====================================================================
echo   - Backend API   : http://localhost:8080/api (Kiem tra: /api/health)
echo   - Customer Web  : http://localhost:5173
echo   - Admin Web     : http://localhost:5174 (admin@example.com / Admin123456)
echo   - Mobile Expo   : Xem ma QR trong cua so terminal Mobile Expo
echo =====================================================================
echo.
echo Ban co the thu nho cua so nay lai. Khi muon tat het, chi can dong cac cua so dich vu.
echo.
pause
