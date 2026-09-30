@echo off
setlocal EnableDelayedExpansion

set "PROJECT_DIR=%~dp0.."
set "SERVER_DIR=%PROJECT_DIR%\server"
set "CLIENT_DIR=%PROJECT_DIR%\client"
set "LOG_DIR=%PROJECT_DIR%\logs"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value 2^>nul') do set "dt=%%I"
set "TIMESTAMP=%dt:~0,4%-%dt:~4,2%-%dt:~6,2%_%dt:~8,2%-%dt:~10,2%-%dt:~12,2%"

echo [%TIMESTAMP%] LPMS Development Servers Startup >> "%LOG_DIR%\startup.log"

set "SERVER_PORT=5000"
set "CLIENT_PORT=5173"

netstat -ano | findstr ":%SERVER_PORT% " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo [%TIMESTAMP%] Port %SERVER_PORT% already in use - skipping server >> "%LOG_DIR%\startup.log"
    echo Port %SERVER_PORT% already in use - skipping server
) else (
    echo [%TIMESTAMP%] Starting server on port %SERVER_PORT%... >> "%LOG_DIR%\startup.log"
    echo Starting server on port %SERVER_PORT%...
    start "LPMS Server" /min cmd /c "cd /d "%SERVER_DIR%" && node server.js > "%LOG_DIR%\server.log" 2>&1"
    timeout /t 2 /nobreak >nul
)

netstat -ano | findstr ":%CLIENT_PORT% " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo [%TIMESTAMP%] Port %CLIENT_PORT% already in use - skipping client >> "%LOG_DIR%\startup.log"
    echo Port %CLIENT_PORT% already in use - skipping client
) else (
    echo [%TIMESTAMP%] Starting client on port %CLIENT_PORT%... >> "%LOG_DIR%\startup.log"
    echo Starting client on port %CLIENT_PORT%...
    start "LPMS Client" /min cmd /c "cd /d "%CLIENT_DIR%" && npm run dev > "%LOG_DIR%\client.log" 2>&1"
)

echo [%TIMESTAMP%] Startup complete >> "%LOG_DIR%\startup.log"
echo Startup complete. Check logs\ for output.
