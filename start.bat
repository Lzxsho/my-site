@echo off
rem ===========================================================================
rem  start.bat  ---  double-click this file to run the site
rem  (kept ASCII-only on purpose: non-ASCII text in .bat files often garbles
rem   because cmd.exe reads the file in the system codepage, not UTF-8.
rem   All the friendly Chinese messages are printed by node instead.)
rem ===========================================================================

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   [!] Node.js not found.
  echo.
  echo   Please install Node.js 22 or newer from https://nodejs.org/
  echo   then double-click this file again.
  echo.
  pause
  exit /b 1
)

if not exist "db\site.db" (
  echo.
  echo   First run - creating the database...
  node db\seed.js
  if errorlevel 1 (
    pause
    exit /b 1
  )
)

node server.js

echo.
echo   Server stopped.
pause
