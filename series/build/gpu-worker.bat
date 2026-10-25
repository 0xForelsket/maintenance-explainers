@echo off
title Explainer GPU render worker
cd /d "%~dp0..\.."
where node 1>NUL 2>NUL
if errorlevel 1 (
  echo Node.js was not found. Install the LTS version from https://nodejs.org and run this again.
  pause
  exit /b 1
)
echo Starting the GPU render worker. Leave this window open while videos render.
node series\build\gpu-worker.mjs
pause
