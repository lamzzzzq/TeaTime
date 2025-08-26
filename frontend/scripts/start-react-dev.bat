@echo off
REM Convai React Web Chat 开发环境启动脚本 (Windows)

echo.
echo ========================================
echo  Convai React Web Chat 开发环境启动
echo ========================================
echo.

REM 检查 Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] Node.js 未安装，请先安装 Node.js
    pause
    exit /b 1
)

REM 检查 npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo [错误] npm 未安装，请先安装 npm
    pause
    exit /b 1
)

echo [信息] Node.js 和 npm 检查通过
echo.

REM 检查前端依赖
if not exist node_modules (
    echo [信息] 首次运行，正在安装前端依赖...
    npm install
    if errorlevel 1 (
        echo [错误] 前端依赖安装失败
        pause
        exit /b 1
    )
    echo [成功] 前端依赖安装完成
    echo.
)

REM 检查后端依赖
cd ..\backend
if not exist node_modules (
    echo [信息] 正在安装后端依赖...
    npm install
    if errorlevel 1 (
        echo [错误] 后端依赖安装失败
        pause
        exit /b 1
    )
    echo [成功] 后端依赖安装完成
    echo.
)

echo [信息] 启动后端服务器 (端口3001)...
start "Convai Backend" cmd /k "npm start"

cd ..\frontend

echo [信息] 等待3秒后启动React开发服务器...
timeout /t 3 /nobreak >nul

echo [信息] 启动React开发服务器 (端口3000)...
echo [信息] 前端地址: http://localhost:3000
echo [信息] 后端API: http://localhost:3001
echo.
echo [提示] 按 Ctrl+C 停止服务器
echo ========================================
echo.

REM 启动React开发服务器
npm start

echo.
echo [信息] React开发服务器已停止
pause

