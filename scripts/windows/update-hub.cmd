@echo off
rem After copying in a new update: stops the Hub, rebuilds it, and starts it again in the background.
rem (If the update notes mention a database change, run the migrate command first.)
cd /d "%~dp0..\.."
call "%~dp0stop-hub.cmd"
echo Building... this takes a minute.
call npm run build
if errorlevel 1 (
  echo.
  echo Build failed - the Hub was not restarted. Send a screenshot of the error above.
  pause
  exit /b 1
)
wscript "%~dp0start-hub-hidden.vbs"
echo sudo.me restarted. Open https://YOUR-LAPTOP.ts.net or http://localhost:3000
pause
