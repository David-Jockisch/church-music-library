@echo off
title Church Music Importer

cd /d "%~dp0"

echo.
echo Starting Church Music Importer...
echo.

node "tools\importer\church-music-importer.js"

if errorlevel 1 (
    echo.
    echo The importer exited with an error.
    echo.
    pause
)
