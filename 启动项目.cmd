@echo off
REM Convai React Web Chat 项目启动脚本 (Windows)
REM 从根目录启动整个项目

echo.
echo ========================================
echo  Convai React Web Chat 项目启动
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

REM 进入前端目录启动
cd frontend
echo [信息] 进入前端目录: %CD%
echo.

REM 调用前端启动脚本
call scripts\start-react-dev.bat

echo.
echo [信息] 项目已停止
pause

