@echo off
title Enviar para o GitHub
echo ========================================================
echo   Enviando o projeto para o GitHub...
echo ========================================================
echo.
git push -u origin main
echo.
if %ERRORLEVEL% equ 0 (
    echo ========================================================
    echo   Sucesso! O projeto foi enviado para o GitHub.
    echo ========================================================
) else (
    echo ========================================================
    echo   Ocorreu um erro no envio. Verifique o login do GitHub.
    echo ========================================================
)
echo.
pause
