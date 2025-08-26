#!/bin/bash

# Convai React Web Chat 开发环境启动脚本 (Linux/macOS)

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[信息]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[成功]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[警告]${NC} $1"
}

log_error() {
    echo -e "${RED}[错误]${NC} $1"
}

echo ""
echo "========================================"
echo " Convai React Web Chat 开发环境启动"
echo "========================================"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js 未安装，请先安装 Node.js"
    exit 1
fi

# 检查 npm
if ! command -v npm &> /dev/null; then
    log_error "npm 未安装，请先安装 npm"
    exit 1
fi

log_success "Node.js 和 npm 检查通过"
echo ""

# 检查前端依赖
if [ ! -d "node_modules" ]; then
    log_info "首次运行，正在安装前端依赖..."
    npm install
    log_success "前端依赖安装完成"
    echo ""
fi

# 检查后端依赖
cd ../backend
if [ ! -d "node_modules" ]; then
    log_info "正在安装后端依赖..."
    npm install
    log_success "后端依赖安装完成"
    echo ""
fi

# 启动后端服务器（后台运行）
log_info "启动后端服务器 (端口3001)..."
npm start &
BACKEND_PID=$!

cd ../frontend

# 等待后端启动
sleep 3

log_info "启动React开发服务器 (端口3000)..."
log_info "前端地址: http://localhost:3000"
log_info "后端API: http://localhost:3001"
echo ""
log_info "按 Ctrl+C 停止所有服务器"
echo "========================================"
echo ""

# 清理函数
cleanup() {
    log_info "正在停止服务器..."
    kill $BACKEND_PID 2>/dev/null || true
    log_success "所有服务器已停止"
}

# 设置信号处理
trap cleanup EXIT INT TERM

# 启动React开发服务器
npm start

