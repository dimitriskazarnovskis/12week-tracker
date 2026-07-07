@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================================
echo  Публикация Kazarnovskis Dashboard на GitHub Pages
echo ============================================================
echo.

where gh >nul 2>nul
if errorlevel 1 (
  echo [!] GitHub CLI не найден. Установите его командой:
  echo     winget install GitHub.cli
  echo     ...и запустите этот скрипт заново в НОВОМ окне терминала.
  pause & exit /b 1
)

gh auth status >nul 2>nul
if errorlevel 1 (
  echo Шаг 1: вход в GitHub — сейчас откроется браузер, подтвердите вход.
  gh auth login --web --git-protocol https
  if errorlevel 1 ( echo [!] Вход не выполнен. & pause & exit /b 1 )
)

echo Шаг 2: создаю репозиторий и загружаю код...
gh repo create kazarnovskis-dashboard --public --source . --remote origin --push
if errorlevel 1 (
  echo Репозиторий уже существует — просто загружаю свежий код...
  git push -u origin main
)

echo Шаг 3: включаю GitHub Pages (сборка через Actions)...
gh api -X POST repos/{owner}/kazarnovskis-dashboard/pages -f build_type=workflow >nul 2>nul
gh api -X PUT repos/{owner}/kazarnovskis-dashboard/pages -f build_type=workflow >nul 2>nul

echo.
echo ============================================================
echo  Готово! Через 2-3 минуты приложение будет доступно по адресу:
for /f "usebackq tokens=*" %%u in (`gh api user --jq .login 2^>nul`) do echo  https://%%u.github.io/kazarnovskis-dashboard/
echo  Ход сборки: gh run watch  (или вкладка Actions на GitHub)
echo ============================================================
pause
