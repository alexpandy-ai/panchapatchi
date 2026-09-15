@echo off
echo Building...
set PATH=C:\Program Files\nodejs;%PATH%
cd /D "D:\alex\apps\panchapatchi"
call npm run build
echo Deploying to Harvis...
set NPM_CONFIG_CACHE=D:\alex\apps\velliastro\npm-cache
call npx --yes harvis deploy dist
echo.
echo Done. Open https://panchapakshi.harvis.page and press Ctrl+Shift+R to hard refresh.
pause
