@echo off
chcp 65001 >nul
title FLCL Fire Starter
cd /d "%~dp0"

echo ========================================================
echo   『フリクリ』FIRE STARTER（ファイヤースターター）
echo ========================================================
echo.
echo ローカルサーバーを起動し、ブラウザを開きます...
echo （ゲームを終了する時は、この画面を閉じてください）
echo.

:: ブラウザを自動起動
start "" "http://localhost:8080"

:: Node.js があれば npm start、なければ Python で起動
where node >nul 2>&1
if %ERRORLEVEL% equ 0 (
    npm start
    goto end
)

where python >nul 2>&1
if %ERRORLEVEL% equ 0 (
    python -m http.server 8080
    goto end
)

echo [エラー] Node.js または Python が見つかりませんでした。
echo ゲームを実行するには Node.js または Python が必要です。
pause

:end
