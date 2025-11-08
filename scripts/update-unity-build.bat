@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
REM Unity WebGL 构建文件更新脚本
REM 使用方法: update-unity-build.bat "Unity构建输出目录路径"

echo.
echo ========================================
echo  Unity WebGL 构建文件更新工具
echo ========================================
echo.

REM 检查是否提供了构建目录参数
if "%~1"=="" (
    echo [错误] 请提供Unity构建输出目录路径
    echo.
    echo 使用方法:
    echo   update-unity-build.bat "C:\Users\YourName\Desktop\UnityBuild"
    echo.
    pause
    exit /b 1
)

set "UNITY_BUILD_DIR=%~1"
set "TARGET_DIR=%~dp0..\frontend\public\unity-build"

REM 检查Unity构建目录是否存在
if not exist "%UNITY_BUILD_DIR%" (
    echo [错误] Unity构建目录不存在: %UNITY_BUILD_DIR%
    pause
    exit /b 1
)

REM 检查必需的文件
if not exist "%UNITY_BUILD_DIR%\Build" (
    echo [错误] 找不到 Build 文件夹，这可能不是有效的Unity WebGL构建
    pause
    exit /b 1
)

echo [信息] Unity构建目录: %UNITY_BUILD_DIR%
echo [信息] 目标目录: %TARGET_DIR%
echo.

REM 询问用户确认
echo [警告] 这将替换现有的Unity构建文件
echo.
set /p confirm="确认继续？(y/n): "
if /i not "%confirm%"=="y" (
    echo [取消] 操作已取消
    pause
    exit /b 0
)

echo.
echo [步骤 1/4] 备份现有构建...
if exist "%TARGET_DIR%" (
    for /f %%i in ('powershell -NoProfile -Command "(Get-Date).ToString(''yyyyMMdd-HHmmss'')"') do set TS=%%i
    set "BACKUP_DIR=%TARGET_DIR%-backup-!TS!"

    if exist "!BACKUP_DIR!" (
        rmdir /s /q "!BACKUP_DIR!"
    )

    xcopy "%TARGET_DIR%" "!BACKUP_DIR!\" /E /I /H /Y >nul
    echo [成功] 已备份到: !BACKUP_DIR!
) else (
    echo [信息] 无需备份，目标目录不存在
)

echo.
echo [步骤 2/4] 清理目标目录...
if exist "%TARGET_DIR%\Build" (
    rmdir /s /q "%TARGET_DIR%\Build"
)
echo [成功] Build 文件夹已清理

echo.
echo [步骤 3/4] 复制新的构建文件...

REM 复制 Build 文件夹
xcopy "%UNITY_BUILD_DIR%\Build" "%TARGET_DIR%\Build\" /E /I /H /Y >nul
echo [成功] Build 文件夹已复制

REM 如果存在 TemplateData，也复制它
if exist "%UNITY_BUILD_DIR%\TemplateData" (
    if exist "%TARGET_DIR%\TemplateData" (
        rmdir /s /q "%TARGET_DIR%\TemplateData"
    )
    xcopy "%UNITY_BUILD_DIR%\TemplateData" "%TARGET_DIR%\TemplateData\" /E /I /H /Y >nul
    echo [成功] TemplateData 文件夹已复制
)

REM 保留现有的 index.html（包含React通信代码）
REM 但如果需要更新，给出提示
if exist "%UNITY_BUILD_DIR%\index.html" (
    echo [信息] 发现新的 index.html，但保留现有版本（包含React通信代码）
    echo [提示] 如需更新 index.html，请手动合并或参考文档
)

echo.
echo [步骤 4/4] 验证构建文件...

set "ERRORS=0"

if not exist "%TARGET_DIR%\Build\*.data" (
    echo [警告] 未找到 .data 文件
    set /a ERRORS+=1
)

if not exist "%TARGET_DIR%\Build\*.wasm" (
    echo [警告] 未找到 .wasm 文件
    set /a ERRORS+=1
)

if not exist "%TARGET_DIR%\Build\*.loader.js" (
    echo [警告] 未找到 .loader.js 文件
    set /a ERRORS+=1
)

if not exist "%TARGET_DIR%\Build\*.framework.js" (
    echo [警告] 未找到 .framework.js 文件
    set /a ERRORS+=1
)

if %ERRORS% equ 0 (
    echo [成功] 所有必需文件已验证
) else (
    echo [警告] 发现 %ERRORS% 个问题，构建可能不完整
)

echo.
echo ========================================
echo  ✅ Unity构建文件更新完成！
echo ========================================
echo.
echo [下一步] 重启开发服务器以加载新的构建文件：
echo   1. 关闭当前运行的服务器 (Ctrl+C)
echo   2. 运行: 启动项目.cmd
echo.
echo [清除缓存] 如果浏览器仍显示旧版本，请：
echo   1. 按 Ctrl+Shift+R 强制刷新
echo   2. 或清除浏览器缓存
echo.

pause

