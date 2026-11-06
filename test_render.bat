@echo off
call npm install
call npx remotion render src/index.jsx Galveston out\test.mp4 --gl=angle --frames=0-29 --image-format=jpeg --jpeg-quality=92
pause
