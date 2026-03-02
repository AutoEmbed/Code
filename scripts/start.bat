@echo off
chcp 65001 >nul
cd /d "%~dp0.."
echo Starting AutoEmbed GUI...
npm run dev
