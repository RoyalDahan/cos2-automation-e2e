@echo off
REM ===========================================================================
REM  COS2 regression - UPDATE role
REM
REM  Everything the Admin run covers except the Admin area, plus the negative
REM  cases proving /admin is refused for this role.
REM
REM  Usage:   Update.bat            run headed (you can watch it)
REM           Update.bat headless   run with no visible browser
REM           Update.bat debug      step through with the Playwright Inspector
REM           Update.bat ui         open the Playwright UI runner
REM
REM  Signs in with COS_UPDATE_USER from .env (your own account until the role
REM  gets its own). The browser window stays open between runs.
REM ===========================================================================
setlocal
cd /d "%~dp0"

set "ROLE_NAME=update"
set "MODE=%~1"

if /i "%MODE%"=="headless" set "HEADLESS=1"
if /i "%MODE%"=="debug"    set "PWDEBUG=1"

echo.
echo ========================================
echo  COS2 regression - UPDATE role
if /i "%MODE%"=="headless" (echo  mode: headless) else (echo  mode: headed)
echo ========================================
echo.

if /i "%MODE%"=="ui" (
  call npx playwright test --project=%ROLE_NAME% --ui
) else (
  call npx playwright test --project=%ROLE_NAME%
)

set "EXITCODE=%ERRORLEVEL%"

echo.
echo ========================================
echo  Finished with exit code %EXITCODE%
echo  Opening the dashboard...
echo  Full Playwright report: npx playwright show-report reports\html
echo ========================================
echo.

if exist "reports\dashboard.html" start "" "reports\dashboard.html"

pause
exit /b %EXITCODE%
