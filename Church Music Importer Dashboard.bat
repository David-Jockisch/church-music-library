@echo off
setlocal
cd /d "%~dp0"
title Church Music Importer Dashboard
where node >nul 2>&1 || (echo Node.js is required. & pause & exit /b 1)
if not exist "node_modules\@aws-sdk\client-s3" (
  echo Installing required packages...
  call npm install || (pause & exit /b 1)
)
start "" "http://127.0.0.1:8765"
node "tools\importer\dashboard.js"
if errorlevel 1 pause
