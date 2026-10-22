@echo off
REM ===========================================================================
REM  COS2 regression - ADMIN role (Credential Online user)
REM
REM  Usage:   Admin.bat            run headed (you can watch it)
REM           Admin.bat headless   run with no visible browser
REM           Admin.bat debug      step through with the Playwright Inspector
REM           Admin.bat ui         open the Playwright UI runner
REM
REM  The first run signs in; after that the saved profile is reused.
REM ===========================================================================
setlocal
cd /d "%~dp0"

set "ROLE_NAME=admin"
set "MODE=%~1"

if /i "%MODE%"=="headless" set "HEADLESS=1"
if /i "%MODE%"=="debug"    set "PWDEBUG=1"

echo.
echo ========================================
echo  COS2 regression - ADMIN role
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
