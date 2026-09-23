@echo off
setlocal
cd /d "%~dp0"
echo ============================================================
echo   CHURCH MUSIC LIBRARY - APPLY UPDATE AND PUSH
echo ============================================================
echo.
where git >nul 2>nul || (
  echo Git was not found on this computer.
  echo The files are updated locally, but they could not be pushed.
  pause
  exit /b 1
)

echo Staging only the files included in this feature update...
git add -- "js/app.js" "service-worker.js" "tools/r2/r2-shared.js" "tools/importer/church-music-importer.js" "Church Music Importer.bat"

git diff --cached --quiet && (
  echo No update files need to be committed.
  echo.
  pause
  exit /b 0
)

echo Creating update commit...
git commit -m "Add multiple sheet music support"
if errorlevel 1 goto :fail

echo Pushing to GitHub...
git push
if errorlevel 1 goto :fail

echo.
echo SUCCESS - Multiple sheet music support is pushed to GitHub.
echo Your normal importer can now handle future library pushes.
pause
exit /b 0

:fail
echo.
echo The push did not complete. Your changed files are still safe locally.
pause
exit /b 1
