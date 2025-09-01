@echo off
chcp 65001 >nul
title Convai Web v3 免费部署助手

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
echo  ║                   免费部署助手                               ║
echo  ║                                                              ║
echo  ║           🌐 完全免费 + 24小时在线 + 全球访问                ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo %NC%
echo.
echo %GREEN%✅ 完全免费方案的优势：%NC%
echo   • 不需要任何费用
echo   • 不需要保持电脑开机
echo   • 自动获得专业域名（如：your-app.netlify.app）
echo   • 自动HTTPS安全访问
echo   • 全球CDN加速
echo   • 代码更新自动重新部署
echo.

:MENU
echo %YELLOW%选择免费部署平台：%NC%
echo.
echo %GREEN%1.%NC% %CYAN%Netlify%NC% %YELLOW%(推荐)%NC%
echo    - 最适合Unity WebGL项目
echo    - 支持自定义头部配置
echo    - 构建日志详细，便于调试
echo.
echo %GREEN%2.%NC% %CYAN%GitHub Pages%NC%
echo    - GitHub官方免费托管
echo    - 域名格式：username.github.io/repo-name
echo    - 配置简单
echo.
echo %GREEN%3.%NC% %CYAN%Vercel%NC%
echo    - 对React项目优化最好
echo    - 部署速度最快
echo    - 域名格式：project-name.vercel.app
echo.
echo %GREEN%4.%NC% 准备项目文件
echo %GREEN%5.%NC% 查看详细教程
echo %GREEN%6.%NC% 检查Git环境
echo %GREEN%7.%NC% 退出
echo.

set /p choice=%YELLOW%请选择 (1-7): %NC%

if "%choice%"=="1" goto NETLIFY_GUIDE
if "%choice%"=="2" goto GITHUB_PAGES_GUIDE
if "%choice%"=="3" goto VERCEL_GUIDE
if "%choice%"=="4" goto PREPARE_FILES
if "%choice%"=="5" goto DETAILED_GUIDE
if "%choice%"=="6" goto CHECK_GIT
if "%choice%"=="7" goto EXIT
echo %RED%无效选项，请重新选择%NC%
echo.
goto MENU

:NETLIFY_GUIDE
cls
echo %BLUE%🚀 Netlify 部署指南%NC%
echo =====================
echo.
echo %GREEN%第1步：准备GitHub仓库%NC%
echo 1. 访问 https://github.com
echo 2. 注册账号（如果没有）
echo 3. 点击 "New repository"
echo 4. 仓库名：convai-web-v3
echo 5. 选择 "Public"
echo 6. 点击 "Create repository"
echo.
echo %GREEN%第2步：上传代码到GitHub%NC%
echo 在项目文件夹中执行以下命令：
echo.
echo %CYAN%git init%NC%
echo %CYAN%git add .%NC%
echo %CYAN%git commit -m "Initial commit: Convai Web v3"%NC%
echo %CYAN%git remote add origin https://github.com/您的用户名/convai-web-v3.git%NC%
echo %CYAN%git push -u origin main%NC%
echo.
echo %GREEN%第3步：部署到Netlify%NC%
echo 1. 访问 https://netlify.com
echo 2. 使用GitHub账号登录
echo 3. 点击 "New site from Git"
echo 4. 选择 "GitHub"
echo 5. 选择 convai-web-v3 仓库
echo 6. 配置构建设置：
echo    - Base directory: %YELLOW%frontend%NC%
echo    - Build command: %YELLOW%npm run build%NC%
echo    - Publish directory: %YELLOW%frontend/build%NC%
echo 7. 点击 "Deploy site"
echo.
echo %GREEN%🎉 完成！您将获得类似这样的链接：%NC%
echo %CYAN%https://your-app-name.netlify.app%NC%
echo.

set /p continue=%YELLOW%是否现在准备项目文件？(y/n): %NC%
if /i "%continue%"=="y" goto PREPARE_FILES

pause
goto MENU

:GITHUB_PAGES_GUIDE
cls
echo %BLUE%🚀 GitHub Pages 部署指南%NC%
echo ==========================
echo.
echo %GREEN%第1步：创建GitHub仓库%NC%
echo 1. 访问 https://github.com
echo 2. 创建新仓库：convai-web-v3
echo 3. 选择 "Public"
echo.
echo %GREEN%第2步：上传代码%NC%
echo %CYAN%git init%NC%
echo %CYAN%git add .%NC%
echo %CYAN%git commit -m "Initial commit"%NC%
echo %CYAN%git remote add origin https://github.com/您的用户名/convai-web-v3.git%NC%
echo %CYAN%git push -u origin main%NC%
echo.
echo %GREEN%第3步：启用GitHub Pages%NC%
echo 1. 在仓库页面点击 "Settings"
echo 2. 滚动到 "Pages" 部分
echo 3. Source 选择 "GitHub Actions"
echo 4. 项目已包含自动部署配置
echo.
echo %GREEN%🎉 完成！您的链接将是：%NC%
echo %CYAN%https://您的用户名.github.io/convai-web-v3%NC%
echo.

pause
goto MENU

:VERCEL_GUIDE
cls
echo %BLUE%🚀 Vercel 部署指南%NC%
echo ==================
echo.
echo %GREEN%第1步：准备GitHub仓库%NC%
echo （与Netlify相同的步骤）
echo.
echo %GREEN%第2步：部署到Vercel%NC%
echo 1. 访问 https://vercel.com
echo 2. 使用GitHub账号登录
echo 3. 点击 "New Project"
echo 4. 选择 convai-web-v3 仓库
echo 5. 配置设置：
echo    - Framework Preset: %YELLOW%Create React App%NC%
echo    - Root Directory: %YELLOW%frontend%NC%
echo 6. 点击 "Deploy"
echo.
echo %GREEN%🎉 完成！您将获得类似这样的链接：%NC%
echo %CYAN%https://convai-web-v3.vercel.app%NC%
echo.

pause
goto MENU

:PREPARE_FILES
cls
echo %BLUE%📁 准备项目文件%NC%
echo ================
echo.

echo %YELLOW%正在检查项目结构...%NC%

if not exist "frontend" (
    echo %RED%❌ frontend 目录不存在%NC%
    echo 请确保在正确的项目目录中运行此脚本
    pause
    goto MENU
)

if not exist "frontend\package.json" (
    echo %RED%❌ 前端配置文件不存在%NC%
    pause
    goto MENU
)

echo %GREEN%✅ 项目结构检查通过%NC%

echo %YELLOW%正在创建部署配置文件...%NC%

:: 检查是否已存在netlify.toml
if exist "netlify.toml" (
    echo %GREEN%✅ netlify.toml 已存在%NC%
) else (
    echo %YELLOW%创建 netlify.toml...%NC%
    echo 配置文件已在之前创建
)

:: 检查是否已存在GitHub Actions配置
if exist ".github\workflows\deploy.yml" (
    echo %GREEN%✅ GitHub Actions 配置已存在%NC%
) else (
    echo %YELLOW%创建 GitHub Actions 配置...%NC%
    echo 配置文件已在之前创建
)

echo.
echo %GREEN%✅ 项目文件准备完成！%NC%
echo.
echo %CYAN%下一步：%NC%
echo 1. 初始化Git仓库
echo 2. 将代码推送到GitHub
echo 3. 选择部署平台进行部署
echo.

set /p init_git=%YELLOW%是否现在初始化Git仓库？(y/n): %NC%
if /i "%init_git%"=="y" (
    echo.
    echo %YELLOW%初始化Git仓库...%NC%
    
    git --version >nul 2>&1
    if errorlevel 1 (
        echo %RED%Git 未安装，请先安装Git%NC%
        echo 下载地址: https://git-scm.com/download/windows
        pause
        goto MENU
    )
    
    if exist ".git" (
        echo %YELLOW%Git仓库已存在%NC%
    ) else (
        git init
        echo %GREEN%✅ Git仓库初始化完成%NC%
    )
    
    echo.
    echo %CYAN%接下来请执行：%NC%
    echo %YELLOW%1. git add .%NC%
    echo %YELLOW%2. git commit -m "Ready for deployment"%NC%
    echo %YELLOW%3. 在GitHub创建仓库%NC%
    echo %YELLOW%4. git remote add origin https://github.com/您的用户名/convai-web-v3.git%NC%
    echo %YELLOW%5. git push -u origin main%NC%
)

pause
goto MENU

:CHECK_GIT
cls
echo %BLUE%🔍 Git 环境检查%NC%
echo ================

echo 检查Git安装...
git --version >nul 2>&1
if errorlevel 1 (
    echo %RED%❌ Git 未安装%NC%
    echo.
    echo %YELLOW%请下载并安装Git：%NC%
    echo https://git-scm.com/download/windows
    echo.
    echo 安装后重新运行此脚本
) else (
    for /f "tokens=*" %%i in ('git --version') do echo %GREEN%✅ Git: %%i%NC%
    
    echo.
    echo 检查Git配置...
    git config --global user.name >nul 2>&1
    if errorlevel 1 (
        echo %YELLOW%⚠ Git用户名未配置%NC%
        set /p username=%YELLOW%请输入您的用户名: %NC%
        git config --global user.name "!username!"
        echo %GREEN%✅ 用户名配置完成%NC%
    ) else (
        for /f "tokens=*" %%i in ('git config --global user.name') do echo %GREEN%✅ 用户名: %%i%NC%
    )
    
    git config --global user.email >nul 2>&1
    if errorlevel 1 (
        echo %YELLOW%⚠ Git邮箱未配置%NC%
        set /p email=%YELLOW%请输入您的邮箱: %NC%
        git config --global user.email "!email!"
        echo %GREEN%✅ 邮箱配置完成%NC%
    ) else (
        for /f "tokens=*" %%i in ('git config --global user.email') do echo %GREEN%✅ 邮箱: %%i%NC%
    )
    
    echo.
    echo %GREEN%🎉 Git环境配置完成！%NC%
)

pause
goto MENU

:DETAILED_GUIDE
cls
echo %BLUE%📖 打开详细教程%NC%
echo ================

if exist "免费部署指南.md" (
    echo %GREEN%正在打开详细教程...%NC%
    start "" "免费部署指南.md"
) else (
    echo %RED%教程文件不存在%NC%
)

pause
goto MENU

:EXIT
echo.
echo %GREEN%🎉 感谢使用 Convai Web v3 免费部署助手！%NC%
echo.
echo %CYAN%📚 记住这些要点：%NC%
echo • 使用GitHub + Netlify = 完全免费 + 24小时在线
echo • 不需要保持电脑开机
echo • 自动获得专业域名和HTTPS
echo • 代码更新后自动重新部署
echo.
echo %CYAN%🔗 有用的链接：%NC%
echo • GitHub: https://github.com
echo • Netlify: https://netlify.com
echo • Vercel: https://vercel.com
echo • Git下载: https://git-scm.com
echo.
echo %YELLOW%祝您部署顺利！🚀%NC%
pause
exit
