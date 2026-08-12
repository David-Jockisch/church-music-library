@echo off
title Church Music Importer - R2
cd /d "%~dp0"

echo.
echo Starting Church Music Importer...
echo.

node "tools\importer\church-music-importer.js"

if errorlevel 1 (
  echo.
  echo Importer exited with an error.
  pause
)
