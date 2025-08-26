@echo off
chcp 65001 >nul
echo.
echo ========================================
echo      关闭 Convai 项目服务器
echo ========================================
echo.

echo 🛑 正在关闭所有相关服务器...

echo 📍 关闭 Node.js 进程...
taskkill /f /im node.exe >nul 2>&1

echo 📍 关闭 npm 进程...
taskkill /f /im npm.exe >nul 2>&1

echo 📍 检查端口占用情况...
netstat -ano | findstr ":3000\|:3001\|:3002"

echo.
echo ✅ 服务器关闭完成！
echo.
echo 按任意键退出...
pause >nul

