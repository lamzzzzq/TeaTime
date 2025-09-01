@echo off
chcp 65001 >nul
title Convai Web v3 一键部署工具

:: 设置颜色
for /f %%a in ('echo prompt $E ^| cmd') do set "ESC=%%a"
set "BLUE=%ESC%[34m"
set "GREEN=%ESC%[32m"
set "YELLOW=%ESC%[33m"
set "RED=%ESC%[31m"
set "CYAN=%ESC%[36m"
set "NC=%ESC%[0m"

cls
echo %CYAN%
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║                    Convai Web v3                             ║
echo  ║                   一键部署工具                               ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo %NC%
echo.
echo %BLUE%欢迎使用 Convai Web v3 一键部署工具！%NC%
echo 此工具将帮助您快速部署应用，让其他人可以通过链接访问。
echo.

:MENU
echo %YELLOW%请选择部署方式：%NC%
echo.
echo %GREEN%1.%NC% 本地部署 %CYAN%(推荐新手)%NC%
echo    - 在本机运行，通过 IP 地址访问
echo    - 需要保持电脑开机
echo.
echo %GREEN%2.%NC% Docker 部署 %CYAN%(推荐有经验用户)%NC%
echo    - 容器化部署，更稳定
echo    - 需要安装 Docker
echo.
echo %GREEN%3.%NC% 查看云服务器部署指南 %CYAN%(推荐正式使用)%NC%
echo    - 部署到云服务器，24小时在线
echo    - 其他人可以随时访问
echo.
echo %GREEN%4.%NC% 检查环境要求
echo %GREEN%5.%NC% 退出
echo.

set /p choice=%YELLOW%请输入选项 (1-5): %NC%

if "%choice%"=="1" goto LOCAL_DEPLOY
if "%choice%"=="2" goto DOCKER_DEPLOY
if "%choice%"=="3" goto CLOUD_GUIDE
if "%choice%"=="4" goto CHECK_ENV
if "%choice%"=="5" goto EXIT
echo %RED%无效选项，请重新选择%NC%
echo.
goto MENU

:CHECK_ENV
cls
echo %BLUE%[检查] 环境要求检查%NC%
echo ==================

echo 检查 Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo %RED%✗ Node.js 未安装%NC%
    echo   请访问 https://nodejs.org 下载安装
) else (
    for /f "tokens=*" %%i in ('node --version') do echo %GREEN%✓ Node.js: %%i%NC%
)

echo 检查 npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo %RED%✗ npm 未安装%NC%
) else (
    for /f "tokens=*" %%i in ('npm --version') do echo %GREEN%✓ npm: %%i%NC%
)

echo 检查 Docker...
docker --version >nul 2>&1
if errorlevel 1 (
    echo %YELLOW%○ Docker 未安装 (Docker部署需要)%NC%
    echo   如需使用Docker，请访问 https://docker.com 下载安装
) else (
    for /f "tokens=*" %%i in ('docker --version') do echo %GREEN%✓ Docker: %%i%NC%
)

echo.
echo %BLUE%项目文件检查：%NC%
if exist "backend\package.json" (
    echo %GREEN%✓ 后端配置文件存在%NC%
) else (
    echo %RED%✗ 后端配置文件缺失%NC%
)

if exist "frontend\package.json" (
    echo %GREEN%✓ 前端配置文件存在%NC%
) else (
    echo %RED%✗ 前端配置文件缺失%NC%
)

if exist "frontend\public\unity-build" (
    echo %GREEN%✓ Unity WebGL 文件存在%NC%
) else (
    echo %YELLOW%○ Unity WebGL 文件可能缺失%NC%
    echo   请确保 frontend\public\unity-build 目录存在
)

echo.
pause
goto MENU

:LOCAL_DEPLOY
cls
echo %BLUE%[部署] 本地部署模式%NC%
echo ==================

echo %YELLOW%开始本地部署...%NC%
echo.

if exist "scripts\deploy.bat" (
    echo 使用自动部署脚本...
    call scripts\deploy.bat local
) else (
    echo 手动执行部署步骤...
    
    echo %BLUE%步骤 1/4: 安装后端依赖...%NC%
    cd backend
    call npm install
    if errorlevel 1 (
        echo %RED%后端依赖安装失败%NC%
        cd ..
        pause
        goto MENU
    )
    cd ..
    
    echo %BLUE%步骤 2/4: 安装前端依赖...%NC%
    cd frontend
    call npm install
    if errorlevel 1 (
        echo %RED%前端依赖安装失败%NC%
        cd ..
        pause
        goto MENU
    )
    
    echo %BLUE%步骤 3/4: 构建前端...%NC%
    call npm run build
    if errorlevel 1 (
        echo %RED%前端构建失败%NC%
        cd ..
        pause
        goto MENU
    )
    cd ..
    
    echo %BLUE%步骤 4/4: 复制文件...%NC%
    if exist "backend\public" rmdir /s /q "backend\public"
    xcopy "frontend\build" "backend\public" /E /I /Y >nul
)

echo.
echo %GREEN%✅ 部署完成！%NC%
echo.
echo %CYAN%🚀 启动应用：%NC%
echo 1. 打开新的命令行窗口
echo 2. 执行命令：cd backend ^&^& npm start
echo 3. 等待服务器启动完成
echo.
echo %CYAN%🌐 访问地址：%NC%
echo - 本地访问：http://localhost:3000
echo - 局域网访问：http://你的IP地址:3000
echo.
echo %YELLOW%💡 获取你的IP地址：%NC%
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 地址"') do (
    set "ip=%%a"
    set "ip=!ip: =!"
    echo - 可能的访问地址：http://!ip!:3000
)
echo.
echo %CYAN%📋 下一步：%NC%
echo 1. 确保防火墙允许端口 3000
echo 2. 将访问地址分享给其他人
echo 3. 保持电脑开机以维持服务
echo.

set /p start_now=%YELLOW%是否现在启动服务器？(y/n): %NC%
if /i "%start_now%"=="y" (
    echo 正在启动服务器...
    start "Convai Web Server" cmd /c "cd backend && npm start && pause"
)

pause
goto MENU

:DOCKER_DEPLOY
cls
echo %BLUE%[部署] Docker 部署模式%NC%
echo ==================

docker --version >nul 2>&1
if errorlevel 1 (
    echo %RED%Docker 未安装，无法使用此选项%NC%
    echo 请先安装 Docker Desktop
    echo 下载地址: https://www.docker.com/products/docker-desktop
    echo.
    pause
    goto MENU
)

echo %YELLOW%开始 Docker 部署...%NC%
echo.

if exist "scripts\deploy.bat" (
    call scripts\deploy.bat docker
) else (
    echo 手动执行 Docker 部署...
    docker build -t convai-web-v3 .
    if errorlevel 1 (
        echo %RED%Docker 镜像构建失败%NC%
        pause
        goto MENU
    )
    
    docker stop convai-web-v3 >nul 2>&1
    docker rm convai-web-v3 >nul 2>&1
    
    docker run -d --name convai-web-v3 -p 3000:3000 --restart unless-stopped convai-web-v3
    if errorlevel 1 (
        echo %RED%Docker 容器启动失败%NC%
        pause
        goto MENU
    )
)

echo.
echo %GREEN%✅ Docker 部署完成！%NC%
echo.
echo %CYAN%🐳 容器信息：%NC%
docker ps --filter "name=convai-web-v3"
echo.
echo %CYAN%🌐 访问地址：%NC%
echo - http://localhost:3000
echo.
echo %CYAN%📋 管理命令：%NC%
echo - 查看日志：docker logs convai-web-v3
echo - 停止服务：docker stop convai-web-v3
echo - 重启服务：docker restart convai-web-v3
echo.

pause
goto MENU

:CLOUD_GUIDE
cls
echo %BLUE%[指南] 云服务器部署%NC%
echo ==================
echo.
echo %GREEN%云服务器部署的优势：%NC%
echo ✓ 24小时在线，无需保持电脑开机
echo ✓ 专业的网络环境，访问速度快
echo ✓ 可以绑定域名，更专业
echo ✓ 其他人随时可以访问
echo.
echo %CYAN%推荐的云服务商：%NC%
echo.
echo %YELLOW%1. 阿里云 ECS%NC% (国内推荐)
echo   - 新用户有优惠
echo   - 访问速度快
echo   - 网址: https://www.aliyun.com
echo.
echo %YELLOW%2. 腾讯云 CVM%NC% (性价比高)
echo   - 学生优惠
echo   - 操作简单
echo   - 网址: https://cloud.tencent.com
echo.
echo %YELLOW%3. Vultr%NC% (国外推荐)
echo   - 按小时计费
echo   - 全球节点
echo   - 网址: https://www.vultr.com
echo.
echo %GREEN%基础配置建议：%NC%
echo - CPU: 1核心
echo - 内存: 1GB
echo - 硬盘: 20GB
echo - 系统: Ubuntu 20.04
echo - 费用: 约 ￥30-100/月
echo.
echo %CYAN%部署步骤：%NC%
echo 1. 购买云服务器并获取IP地址
echo 2. 通过SSH连接到服务器
echo 3. 安装Node.js和npm
echo 4. 上传项目文件到服务器
echo 5. 运行部署命令
echo 6. 配置防火墙开放端口3000
echo.
echo %YELLOW%详细步骤请查看：部署指南.md%NC%
echo.

set /p open_guide=%YELLOW%是否打开详细部署指南？(y/n): %NC%
if /i "%open_guide%"=="y" (
    if exist "部署指南.md" (
        start "" "部署指南.md"
    ) else (
        echo %RED%部署指南文件不存在%NC%
    )
)

pause
goto MENU

:EXIT
echo.
echo %GREEN%感谢使用 Convai Web v3 部署工具！%NC%
echo.
echo %CYAN%📚 相关文档：%NC%
echo - 部署指南.md - 详细部署说明
echo - DEPLOYMENT.md - 技术文档
echo - README.md - 项目说明
echo.
echo %CYAN%🔗 有用的链接：%NC%
echo - Node.js: https://nodejs.org
echo - Docker: https://www.docker.com
echo - 阿里云: https://www.aliyun.com
echo.
pause
exit
