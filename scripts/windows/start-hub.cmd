@echo off
rem Starts sudo.me in production mode (fast). Used by start-hub-hidden.vbs at Windows sign-in.
cd /d "%~dp0..\.."
if not exist logs mkdir logs
if not exist ".next\BUILD_ID" (
  echo [%date% %time%] No build found, building first... >> logs\hub.log
  call npm run build >> logs\hub.log 2>&1
)
echo [%date% %time%] Starting sudo.me >> logs\hub.log
call npm run start >> logs\hub.log 2>&1
