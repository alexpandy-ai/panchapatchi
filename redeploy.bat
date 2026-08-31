@echo off
echo Building...
set PATH=C:\Program Files\nodejs;%PATH%
cd /D "D:\alex\apps\pancha-patchi"
call npm run build
echo Deploying to Harvis...
set NPM_CONFIG_CACHE=D:\alex\apps\velliastro\npm-cache
cd /D "D:\alex\apps\pancha-patchi\dist"
call npx --yes harvis
echo.
echo Done. Open https://nifty-custard-939.harvis.page and press Ctrl+Shift+R to hard refresh.
pause
