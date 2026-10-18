@echo off
title Push BMS Portal to GitHub (arunekm148/BM-SUPPORT)
color 0A
echo ================================================================
echo   PUSHING TO GITHUB: https://github.com/arunekm148/BM-SUPPORT
echo ================================================================
echo.
cd /d "%~dp0"

echo [1/3] Verifying remote origin...
git remote set-url origin https://github.com/arunekm148/BM-SUPPORT.git
git remote -v
echo.

echo [2/3] Setting branch to main...
git branch -M main
echo.

echo [3/3] Pushing commits to GitHub...
git push -u origin main

echo.
echo ================================================================
echo   SUCCESS! PUSH COMPLETED TO GITHUB!
echo ================================================================
echo.
pause
