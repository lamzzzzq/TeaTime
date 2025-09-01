@echo off
chcp 65001 >nul
title GitHub 仓库完全同步工具

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
echo  ║                  GitHub 仓库完全同步                         ║
echo  ║              将本地项目完全覆盖到GitHub                      ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo %NC%
echo.

echo %YELLOW%⚠️  注意：此操作将会：%NC%
echo   • 完全覆盖GitHub仓库的内容
echo   • 删除GitHub上已不存在于本地的文件
echo   • 添加本地所有新文件
echo   • 保持完全同步
echo.

:: 检查是否在Git仓库中
if not exist ".git" (
    echo %RED%❌ 当前目录不是Git仓库%NC%
    echo.
    echo %YELLOW%需要先初始化Git仓库，请选择：%NC%
    echo %GREEN%1.%NC% 连接到现有的GitHub仓库
    echo %GREEN%2.%NC% 创建新的Git仓库
    echo.
    
    set /p choice=%YELLOW%请选择 (1-2): %NC%
    
    if "!choice!"=="1" (
        set /p repo_url=%YELLOW%请输入GitHub仓库地址: %NC%
        echo %BLUE%正在克隆仓库...%NC%
        git clone "!repo_url!" temp_repo
        if errorlevel 1 (
            echo %RED%克隆失败，请检查仓库地址%NC%
            pause
            exit
        )
        
        echo %BLUE%正在合并文件...%NC%
        xcopy "temp_repo\.git" ".git" /E /I /H /Y >nul
        rmdir /s /q temp_repo
        
        echo %GREEN%✅ 仓库连接完成%NC%
    ) else (
        echo %BLUE%初始化新的Git仓库...%NC%
        git init
        echo %GREEN%✅ Git仓库初始化完成%NC%
        echo.
        echo %YELLOW%请稍后手动添加远程仓库：%NC%
        echo %CYAN%git remote add origin https://github.com/用户名/仓库名.git%NC%
        pause
        exit
    )
)

echo %BLUE%📋 当前Git状态：%NC%
echo ==================

:: 显示远程仓库信息
echo %YELLOW%远程仓库：%NC%
git remote -v
if errorlevel 1 (
    echo %RED%❌ 没有配置远程仓库%NC%
    set /p repo_url=%YELLOW%请输入GitHub仓库地址: %NC%
    git remote add origin "!repo_url!"
    echo %GREEN%✅ 远程仓库已添加%NC%
)

echo.
echo %YELLOW%当前分支：%NC%
git branch --show-current 2>nul || echo main

echo.
echo %YELLOW%文件状态：%NC%
git status --short

echo.
set /p confirm=%YELLOW%确认要完全同步到GitHub吗？(y/n): %NC%

if /i not "%confirm%"=="y" (
    echo %YELLOW%操作已取消%NC%
    pause
    exit
)

echo.
echo %BLUE%🔄 开始同步过程...%NC%
echo =====================

:: 步骤1：添加所有文件
echo %YELLOW%步骤1: 添加所有文件...%NC%
git add .
if errorlevel 1 (
    echo %RED%❌ 添加文件失败%NC%
    pause
    exit
)
echo %GREEN%✅ 文件添加完成%NC%

:: 步骤2：提交更改
echo %YELLOW%步骤2: 提交更改...%NC%
set "commit_msg=Update: 完全同步项目文件 - %date% %time%"
git commit -m "%commit_msg%"
if errorlevel 1 (
    echo %YELLOW%⚠️  没有新的更改需要提交%NC%
) else (
    echo %GREEN%✅ 提交完成%NC%
)

:: 步骤3：获取远程最新状态
echo %YELLOW%步骤3: 获取远程状态...%NC%
git fetch origin
if errorlevel 1 (
    echo %RED%❌ 获取远程状态失败，可能是首次推送%NC%
) else (
    echo %GREEN%✅ 远程状态获取完成%NC%
)

:: 步骤4：强制推送（完全覆盖）
echo %YELLOW%步骤4: 强制推送到GitHub...%NC%
echo %RED%⚠️  正在执行强制推送，这将完全覆盖GitHub上的内容%NC%

git push origin main --force
if errorlevel 1 (
    echo %RED%❌ 推送失败，尝试其他分支...%NC%
    
    :: 尝试master分支
    git push origin master --force
    if errorlevel 1 (
        echo %RED%❌ 推送到master分支也失败%NC%
        echo.
        echo %YELLOW%可能的解决方案：%NC%
        echo 1. 检查网络连接
        echo 2. 检查GitHub仓库权限
        echo 3. 检查仓库地址是否正确
        echo.
        echo %CYAN%当前远程仓库：%NC%
        git remote -v
        pause
        exit
    )
) 

echo.
echo %GREEN%🎉 同步完成！%NC%
echo ================

echo.
echo %CYAN%📊 同步结果：%NC%
echo • 本地所有文件已上传到GitHub
echo • GitHub上的旧文件已被清理
echo • 项目结构完全同步

echo.
echo %CYAN%🔗 接下来可以：%NC%
echo 1. 访问您的GitHub仓库查看文件
echo 2. 使用Netlify部署项目
echo 3. 分享项目链接给其他人

echo.
echo %YELLOW%GitHub仓库地址：%NC%
git config --get remote.origin.url

echo.
set /p open_netlify=%YELLOW%是否现在打开Netlify进行部署？(y/n): %NC%

if /i "%open_netlify%"=="y" (
    echo %BLUE%正在打开Netlify...%NC%
    start https://app.netlify.com/start
    echo.
    echo %CYAN%Netlify部署步骤：%NC%
    echo 1. 点击 "New site from Git"
    echo 2. 选择 "GitHub"
    echo 3. 选择您的仓库
    echo 4. 配置构建设置：
    echo    - Base directory: %YELLOW%frontend%NC%
    echo    - Build command: %YELLOW%npm run build%NC%
    echo    - Publish directory: %YELLOW%frontend/build%NC%
    echo 5. 点击 "Deploy site"
)

echo.
echo %GREEN%✨ 完成！您的项目现在已完全同步到GitHub%NC%
pause
