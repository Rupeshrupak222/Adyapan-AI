@echo off
REM Detached entry point: schtasks launches this so the run survives a shell timeout.
cd /d "F:\Adyapan AI\backend"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "F:\Adyapan AI\backend\scripts\run-test2.ps1" -MaxPasses 10 -ThrottleMs 2500 -LogName test2-full >> "F:\Adyapan AI\backend\logs\test2-full.launcher.log" 2>&1
