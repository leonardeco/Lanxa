@echo off
title Lanxa ERP — Deteniendo...
color 0C

echo.
echo  Deteniendo Lanxa ERP...
echo.

taskkill /FI "WINDOWTITLE eq Backend — FastAPI :8000" /F > nul 2>&1
taskkill /FI "WINDOWTITLE eq Frontend — Vite :5173" /F > nul 2>&1

:: Por si quedan procesos en los puertos
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000 " ^| findstr "LISTENING"') do taskkill /PID %%a /F > nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " ^| findstr "LISTENING"') do taskkill /PID %%a /F > nul 2>&1

echo  Sistema detenido.
echo.
pause
