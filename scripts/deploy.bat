@echo off
:: Convai Web v3 Windows 部署脚本
:: 用于自动化部署流程

setlocal enabledelayedexpansion

echo 🚀 开始部署 Convai Web v3...
echo ==============================

:: 设置颜色（Windows 10+）
for /f %%a in ('echo prompt $E ^| cmd') do set "ESC=%%a"
set "BLUE=%ESC%[34m"
set "GREEN=%ESC%[32m"
set "YELLOW=%ESC%[33m"
set "RED=%ESC%[31m"
set "NC=%ESC%[0m"

:: 获取部署类型参数
set "DEPLOY_TYPE=%1"
if "%DEPLOY_TYPE%"=="" set "DEPLOY_TYPE=local"

echo %BLUE%[INFO]%NC% 选择部署模式: %DEPLOY_TYPE%

:: 检查 Node.js
echo %BLUE%[INFO]%NC% 检查环境要求...
node --version >nul 2>&1
if errorlevel 1 (
    echo %RED%[ERROR]%NC% Node.js 未安装，请先安装 Node.js
    pause
    exit /b 1
)

npm --version >nul 2>&1
if errorlevel 1 (
    echo %RED%[ERROR]%NC% npm 未安装，请先安装 npm
    pause
    exit /b 1
)

:: 检查 Docker（可选）
docker --version >nul 2>&1
if errorlevel 1 (
    echo %YELLOW%[WARNING]%NC% Docker 未安装，将跳过 Docker 部署选项
    set "DOCKER_AVAILABLE=false"
) else (
    set "DOCKER_AVAILABLE=true"
)

echo %GREEN%[SUCCESS]%NC% 环境检查完成

:: 安装后端依赖
echo %BLUE%[INFO]%NC% 安装后端依赖...
cd backend
call npm install
if errorlevel 1 (
    echo %RED%[ERROR]%NC% 后端依赖安装失败
    cd ..
    pause
    exit /b 1
)
cd ..

:: 安装前端依赖
echo %BLUE%[INFO]%NC% 安装前端依赖...
cd frontend
call npm install
if errorlevel 1 (
    echo %RED%[ERROR]%NC% 前端依赖安装失败
    cd ..
    pause
    exit /b 1
)

:: 构建前端
echo %BLUE%[INFO]%NC% 构建前端应用...
call npm run build
if errorlevel 1 (
    echo %RED%[ERROR]%NC% 前端构建失败
    cd ..
    pause
    exit /b 1
)
cd ..

echo %GREEN%[SUCCESS]%NC% 前端构建完成

:: 测试构建结果
echo %BLUE%[INFO]%NC% 测试构建结果...
if not exist "frontend\build" (
    echo %RED%[ERROR]%NC% 前端构建失败，build 目录不存在
    pause
    exit /b 1
)

if not exist "frontend\build\index.html" (
    echo %RED%[ERROR]%NC% 前端构建失败，index.html 不存在
    pause
    exit /b 1
)

echo %GREEN%[SUCCESS]%NC% 构建测试通过

:: 根据部署类型执行相应操作
if "%DEPLOY_TYPE%"=="docker" (
    if "%DOCKER_AVAILABLE%"=="true" (
        echo %BLUE%[INFO]%NC% 使用 Docker 部署...
        
        :: 构建 Docker 镜像
        docker build -t convai-web-v3 .
        if errorlevel 1 (
            echo %RED%[ERROR]%NC% Docker 镜像构建失败
            pause
            exit /b 1
        )
        
        :: 停止现有容器
        docker stop convai-web-v3 >nul 2>&1
        docker rm convai-web-v3 >nul 2>&1
        
        :: 启动新容器
        docker run -d --name convai-web-v3 -p 3000:3000 --restart unless-stopped convai-web-v3
        if errorlevel 1 (
            echo %RED%[ERROR]%NC% Docker 容器启动失败
            pause
            exit /b 1
        )
        
        echo %GREEN%[SUCCESS]%NC% Docker 部署完成
        echo %BLUE%[INFO]%NC% 应用已启动在 http://localhost:3000
    ) else (
        echo %RED%[ERROR]%NC% Docker 不可用，无法执行 Docker 部署
        pause
        exit /b 1
    )
) else (
    echo %BLUE%[INFO]%NC% 本地部署...
    
    :: 清理旧的public目录
    if exist "backend\public" (
        rmdir /s /q "backend\public"
    )
    
    :: 复制前端构建文件
    xcopy "frontend\build" "backend\public" /E /I /Y >nul
    if errorlevel 1 (
        echo %RED%[ERROR]%NC% 文件复制失败
        pause
        exit /b 1
    )
    
    echo %GREEN%[SUCCESS]%NC% 本地部署完成
    echo %BLUE%[INFO]%NC% 使用 'cd backend && npm start' 启动服务器
)

:: 生成部署信息
echo %BLUE%[INFO]%NC% 生成部署信息...

:: 获取当前时间
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YYYY=%dt:~0,4%"
set "MM=%dt:~4,2%"
set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%"
set "Min=%dt:~10,2%"
set "Sec=%dt:~12,2%"
set "timestamp=%YYYY%-%MM%-%DD% %HH%:%Min%:%Sec%"

:: 创建部署信息文件
(
echo # Convai Web v3 部署信息
echo.
echo ## 部署时间
echo %timestamp%
echo.
echo ## 访问地址
echo - 本地访问: http://localhost:3000
echo - API接口: http://localhost:3000/api/health
echo.
echo ## 部署文件
echo - 前端构建: frontend/build/
echo - 后端服务: backend/
echo - Docker镜像: convai-web-v3
echo.
echo ## 环境配置
echo 请根据实际部署环境修改以下文件：
echo - env.example ^(后端环境变量^)
echo - frontend/env.example ^(前端环境变量^)
echo.
echo ## 启动命令
echo ### Docker 方式
echo ```bash
echo docker run -p 3000:3000 convai-web-v3
echo ```
echo.
echo ### 本地方式
echo ```bash
echo cd backend
echo npm start
echo ```
echo.
echo ## 健康检查
echo 访问 http://localhost:3000/api/health 检查服务状态
) > DEPLOYMENT_INFO.md

echo %GREEN%[SUCCESS]%NC% 部署信息已生成: DEPLOYMENT_INFO.md
echo.
echo %GREEN%[SUCCESS]%NC% 🎉 部署完成！
echo %BLUE%[INFO]%NC% 请查看 DEPLOYMENT_INFO.md 获取详细信息

pause
