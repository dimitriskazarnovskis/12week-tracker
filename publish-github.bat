@echo off
setlocal
cd /d "%~dp0"
echo ============================================================
echo  Kazarnovskis Dashboard - publish to GitHub Pages
echo ============================================================
echo.

rem -- locate GitHub CLI even if PATH was not refreshed after install
set "GH=gh"
where gh >nul 2>nul
if errorlevel 1 (
  if exist "%ProgramFiles%\GitHub CLI\gh.exe" (
    set "GH=%ProgramFiles%\GitHub CLI\gh.exe"
  ) else (
    echo [ERROR] GitHub CLI not found. Install it first:
    echo     winget install GitHub.cli
    echo Then run this script again.
    pause
    exit /b 1
  )
)

"%GH%" auth status >nul 2>nul
if errorlevel 1 (
  echo Step 1: GitHub sign-in. Follow the prompts; a browser window will open.
  "%GH%" auth login --web --git-protocol https
)
"%GH%" auth status >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Sign-in failed or was cancelled.
  pause
  exit /b 1
)

set "GHUSER="
for /f "usebackq tokens=*" %%u in (`"%GH%" api user --jq .login`) do set "GHUSER=%%u"
if "%GHUSER%"=="" (
  echo [ERROR] Could not read GitHub account name.
  pause
  exit /b 1
)

echo Step 2: creating repository and uploading code...
"%GH%" repo create 12week-tracker --public --source . --remote origin --push
if errorlevel 1 (
  echo Repository may already exist - pushing latest code instead...
  git remote get-url origin >nul 2>nul || git remote add origin "https://github.com/%GHUSER%/12week-tracker.git"
  git push -u origin main
)

echo Step 3: enabling GitHub Pages (build via Actions)...
"%GH%" api -X POST repos/%GHUSER%/12week-tracker/pages -f build_type=workflow >nul 2>nul
"%GH%" api -X PUT repos/%GHUSER%/12week-tracker/pages -f build_type=workflow >nul 2>nul

echo.
echo ============================================================
echo  DONE! The app will be live in 2-3 minutes at:
echo     https://%GHUSER%.github.io/12week-tracker/
echo  Build progress: the "Actions" tab of the GitHub repository.
echo ============================================================
pause
