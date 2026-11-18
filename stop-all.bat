@echo off
chcp 65001 >nul
title Dung he thong Multilingual AI Narration

echo =====================================================================
echo          DUNG TOAN BO CAC PHAN HE DANG CHAY
echo =====================================================================
echo.
echo Dang dong cac cong 8080 (Backend), 5173 (Customer Web), 5174 (Admin Web), 8081 (Expo)...

for %%p in (8080 5173 5174 8081) do (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r ":%%p[ ]" ^| findstr "LISTENING"') do (
        taskkill /f /pid %%a >nul 2>&1
    )
)

echo.
echo [OK] Da dung tat ca tien trinh tren cac cong 8080, 5173, 5174, 8081!
echo.
pause
