@echo off
echo Building...
set PATH=C:\Program Files\nodejs;%PATH%
cd /D "%~dp0"
call npm run build
echo Deploying to Harvis...
set NPM_CONFIG_CACHE=D:\alex\apps\velliastro\npm-cache
set "HARVIS_DEPLOY_TOKEN="
set "HARVIS_SUBDOMAIN="
call npx --yes harvis deploy dist
echo.
echo Done. Open https://pakshi.harvis.page and press Ctrl+Shift+R to hard refresh.
pause
