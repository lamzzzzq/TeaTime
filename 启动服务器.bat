@echo off
chcp 65001 >nul
echo.
echo ========================================
echo    Convai React + Unity WebGL 项目
echo ========================================
echo.

echo 🔧 正在启动服务器...
echo.

echo 📍 步骤 1: 启动 React 前端服务器 (端口 3000)
start "React Frontend" cmd /k "cd /d %~dp0frontend && npm start"

echo.
echo ⏳ 等待 React 服务器启动...
timeout /t 5 /nobreak >nul

echo 📍 步骤 2: 启动 Node.js 后端服务器 (端口 3001)
start "Node.js Backend" cmd /k "cd /d %~dp0backend && npm run dev"

echo.
echo ✅ 服务器启动完成！
echo.
echo 🌐 请在浏览器中访问: http://localhost:3000
echo.
echo 📝 注意事项:
echo   - React 前端: http://localhost:3000
echo   - Node.js 后端: http://localhost:3001
echo   - 确保 Unity WebGL 文件在 frontend/public/unity-build/ 目录中
echo.
echo 按任意键退出...
pause >nul

