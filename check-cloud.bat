@echo off
rem ============================================================
rem  check-cloud.bat -- double-click to run cloud table check
rem  runs db/check-cloud.js and reports each table's status
rem ============================================================
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel%==0 (
  node db\check-cloud.js
) else (
  "C:\Users\asus\.workbuddy\binaries\node\versions\22.22.2-6\node.exe" db\check-cloud.js
)

echo.
pause
