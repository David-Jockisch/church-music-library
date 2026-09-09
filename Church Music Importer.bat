@echo off
setlocal
title Church Music Importer
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo ERROR: Node.js was not found.
  echo Install Node.js or make sure node.exe is available in PATH.
  echo.
  pause
  exit /b 1
)

node "tools\importer\church-music-importer.js"

if errorlevel 1 (
  echo.
  echo The importer closed with an error.
  pause
)
