@echo off
title Church Music R2 Migration
cd /d "%~dp0"

echo.
echo ============================================================
echo              CHURCH MUSIC R2 MIGRATION
echo ============================================================
echo.
echo 1. Dry Run - inspect matches only
echo 2. Upload matched library to R2
echo 3. Upload and overwrite existing R2 objects
echo 4. Exit
echo.

set /p choice=Choose an option: 

if "%choice%"=="1" (
  node "tools\r2\migrate-to-r2.js"
  echo.
  pause
  exit /b
)

if "%choice%"=="2" (
  node "tools\r2\migrate-to-r2.js" --upload
  echo.
  pause
  exit /b
)

if "%choice%"=="3" (
  node "tools\r2\migrate-to-r2.js" --upload --overwrite
  echo.
  pause
  exit /b
)

exit /b
