@echo off
call npm install
call npx remotion render src/index.jsx Galveston out\full_silent.mp4 --gl=angle --concurrency=4 --image-format=jpeg --jpeg-quality=92 --crf=17
call npx remotion ffmpeg -y -i out\full_silent.mp4 -i voiceover.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest final.mp4
pause
