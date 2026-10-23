@echo off
REM ===========================================================================
REM  COS2 regression - VIEW-ONLY role
REM
REM  Everything readable, plus the negative cases proving this role cannot
REM  reach the Admin area or any editor.
REM
REM  Usage:   View.bat            run headed (you can watch it)
REM           View.bat headless   run with no visible browser
REM           View.bat slow       run headed, pausing 1s before every action
REM           View.bat debug      step through with the Playwright Inspector
REM           View.bat ui         open the Playwright UI runner
REM
REM  Signs in with COS_VIEW_USER from .env (your own account until the role
REM  gets its own). The browser window stays open between runs.
REM ===========================================================================
setlocal
cd /d "%~dp0"

set "ROLE_NAME=view"
set "MODE=%~1"

if /i "%MODE%"=="headless" set "HEADLESS=1"
if /i "%MODE%"=="debug"    set "PWDEBUG=1"
if /i "%MODE%"=="slow"     set "SLOW_MO=1000"

echo.
echo ========================================
echo  COS2 regression - VIEW-ONLY role
if /i "%MODE%"=="headless" (echo  mode: headless) else if /i "%MODE%"=="slow" (echo  mode: headed, slowed down) else (echo  mode: headed)
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
