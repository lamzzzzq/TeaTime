@echo off
chcp 65001 >nul
echo.
echo ========================================
echo    Convai React + Unity WebGL 项目
echo ========================================
echo.

echo 🔧 正在检查项目状态...
echo.

echo 📍 检查前端依赖...
if not exist "frontend\node_modules" (
    echo ❌ 前端依赖未安装，正在安装...
    cd frontend
    call npm install
    cd ..
) else (
    echo ✅ 前端依赖已安装
)

echo.
echo 📍 检查后端依赖...
if not exist "backend\node_modules" (
    echo ❌ 后端依赖未安装，正在安装...
    cd backend
    call npm install
    cd ..
) else (
    echo ✅ 后端依赖已安装
)

echo.
echo 🔧 正在启动服务器...
echo.

echo 📍 步骤 1: 启动 React 前端服务器 (端口 3000)
start "React Frontend" cmd /k "cd /d %~dp0frontend && echo 正在启动 React... && npm start"

echo.
echo ⏳ 等待 React 服务器启动...
timeout /t 8 /nobreak >nul

echo 📍 步骤 2: 启动 Node.js 后端服务器 (端口 3001)
start "Node.js Backend" cmd /k "cd /d %~dp0backend && echo 正在启动后端... && npm run dev"

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
echo 🔍 如果服务器没有启动，请检查:
echo   1. 端口 3000 和 3001 是否被占用
echo   2. 查看新打开的终端窗口中的错误信息
echo   3. 手动运行: cd frontend && npm start
echo.
echo 按任意键退出...
pause >nul

