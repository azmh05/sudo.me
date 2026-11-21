@echo off
rem Stops the running sudo.me server (whatever is listening on port 3000).
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000 " ^| findstr LISTENING') do (
  taskkill /PID %%p /F >nul 2>&1 && echo Stopped sudo.me, process %%p.
)
exit /b 0
