@echo off
rem ===========================================================================
rem  sync-to-cloud.bat --- double-click to push local db/site.db to Supabase
rem  (kept ASCII-only on purpose: non-ASCII text in .bat files often garbles
rem   because cmd.exe reads the file in the system codepage, not UTF-8.
rem   All Chinese messages are printed by node instead.)
rem ===========================================================================

chcp 65001 >nul
cd /d "%~dp0\.."

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   [!] Node.js not found.
  echo.
  echo   Please install Node.js 22.5 or newer from https://nodejs.org/
  echo   then double-click this file again.
  echo.
  pause
  exit /b 1
)

node db\export-to-supabase.js %*

echo.
pause
