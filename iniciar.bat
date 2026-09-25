@echo off
title Sistema de Gestao de Hospedes
echo ========================================================
echo   Iniciando o Sistema de Gestao de Hospedes...
echo ========================================================
echo.
start http://localhost:5173/
npx.cmd pnpm run dev --host --port 5173
pause
