@echo off
setlocal EnableExtensions
cd /d "%~dp0.."

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js wurde nicht gefunden. Bitte Node.js installieren und erneut versuchen.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Installiere Abhaengigkeiten...
  call npm install
  if errorlevel 1 (
    echo npm install ist fehlgeschlagen.
    pause
    exit /b 1
  )
)

REM Bereits gesund? Dann nur Browser oeffnen (kein 504 Outdated Optimize Dep).
powershell -NoProfile -Command "try { $html = Invoke-WebRequest -Uri 'http://localhost:1933/' -UseBasicParsing -TimeoutSec 2; $mod = Invoke-WebRequest -Uri 'http://localhost:1933/src/main.tsx' -UseBasicParsing -TimeoutSec 2; if ($html.StatusCode -eq 200 -and $mod.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
if not errorlevel 1 (
  echo FCS Kaderplaner laeuft bereits auf Port 1933 - oeffne Browser...
  start "" "http://localhost:1933"
  exit /b 0
)

REM Alten / defekten Prozess beenden und Vite-Cache leeren (verhindert grauen Viewport).
powershell -NoProfile -Command "$c = Get-NetTCPConnection -LocalPort 1933 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1; if ($c) { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue }; if (Test-Path 'node_modules\.vite') { Remove-Item -Recurse -Force 'node_modules\.vite' }"

echo Starte FCS Kaderplaner auf http://localhost:1933 ...
call npm run start
set EXITCODE=%ERRORLEVEL%
if not "%EXITCODE%"=="0" (
  echo.
  echo Start fehlgeschlagen ^(Exit-Code %EXITCODE%^).
  pause
)
exit /b %EXITCODE%
