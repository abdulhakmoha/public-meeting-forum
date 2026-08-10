@echo off
echo Starting PMCFMS Application...

REM Start Backend
start "PMCFMS Backend" cmd /k "cd /d C:\Users\kct\OneDrive\Desktop\PMCFMS\backend && npm start"

REM Wait 3 seconds for backend to start
timeout /t 3 /nobreak

REM USB: map phone localhost:5001 -> PC localhost:5001 (fixes mobile "Could not connect")
set ADB=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe
if exist "%ADB%" (
  "%ADB%" reverse tcp:5001 tcp:5001
  echo ADB reverse: phone 127.0.0.1:5001 -^> PC :5001
) else (
  echo WARNING: adb not found - mobile USB tunnel skipped
)

REM Start Frontend (host:true in vite.config allows network access)
start "PMCFMS Frontend" cmd /k "cd /d C:\Users\kct\OneDrive\Desktop\PMCFMS\web && npm run dev"

REM Wait 5 seconds for frontend to start
timeout /t 5 /nobreak

REM Open browser
start "" "http://localhost:5173"

echo ==========================================
echo PMCFMS is running!
echo Computer access:  http://localhost:5173
echo Mobile API (USB): http://127.0.0.1:5001  via adb reverse
echo ==========================================
