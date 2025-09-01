#!/bin/bash

# Convai Web v3 部署脚本
# 用于自动化部署流程

set -e  # 遇到错误立即退出

echo "🚀 开始部署 Convai Web v3..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印彩色消息
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查必要的工具
check_requirements() {
    print_status "检查部署要求..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js 未安装，请先安装 Node.js"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm 未安装，请先安装 npm"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        print_warning "Docker 未安装，将跳过 Docker 部署选项"
    fi
    
    print_success "环境检查完成"
}

# 安装依赖
install_dependencies() {
    print_status "安装项目依赖..."
    
    # 安装后端依赖
    print_status "安装后端依赖..."
    cd backend
    npm install
    cd ..
    
    # 安装前端依赖
    print_status "安装前端依赖..."
    cd frontend
    npm install
    cd ..
    
    print_success "依赖安装完成"
}

# 构建前端
build_frontend() {
    print_status "构建前端应用..."
    
    cd frontend
    npm run build
    cd ..
    
    print_success "前端构建完成"
}

# 测试构建
test_build() {
    print_status "测试构建结果..."
    
    # 检查前端构建文件
    if [ ! -d "frontend/build" ]; then
        print_error "前端构建失败，build 目录不存在"
        exit 1
    fi
    
    # 检查关键文件
    if [ ! -f "frontend/build/index.html" ]; then
        print_error "前端构建失败，index.html 不存在"
        exit 1
    fi
    
    print_success "构建测试通过"
}

# Docker 部署
deploy_docker() {
    if ! command -v docker &> /dev/null; then
        print_warning "Docker 未安装，跳过 Docker 部署"
        return
    fi
    
    print_status "使用 Docker 部署..."
    
    # 构建 Docker 镜像
    docker build -t convai-web-v3 .
    
    # 停止现有容器（如果存在）
    docker stop convai-web-v3 2>/dev/null || true
    docker rm convai-web-v3 2>/dev/null || true
    
    # 启动新容器
    docker run -d \
        --name convai-web-v3 \
        -p 3000:3000 \
        --restart unless-stopped \
        convai-web-v3
    
    print_success "Docker 部署完成"
    print_status "应用已启动在 http://localhost:3000"
}

# 本地部署
deploy_local() {
    print_status "本地部署..."
    
    # 复制前端构建文件到后端
    if [ -d "backend/public" ]; then
        rm -rf backend/public
    fi
    
    cp -r frontend/build backend/public
    
    print_success "本地部署完成"
    print_status "使用 'cd backend && npm start' 启动服务器"
}

# 生成部署信息
generate_deployment_info() {
    print_status "生成部署信息..."
    
    cat > DEPLOYMENT_INFO.md << EOF
# Convai Web v3 部署信息

## 部署时间
$(date)

## 项目版本
- 前端版本: $(node -p "require('./frontend/package.json').version")
- 后端版本: $(node -p "require('./backend/package.json').version")

## 访问地址
- 本地访问: http://localhost:3000
- API接口: http://localhost:3000/api/health

## 部署文件
- 前端构建: frontend/build/
- 后端服务: backend/
- Docker镜像: convai-web-v3

## 环境配置
请根据实际部署环境修改以下文件：
- env.example (后端环境变量)
- frontend/env.example (前端环境变量)

## 启动命令
### Docker 方式
\`\`\`bash
docker run -p 3000:3000 convai-web-v3
\`\`\`

### 本地方式
\`\`\`bash
cd backend
npm start
\`\`\`

## 健康检查
访问 http://localhost:3000/api/health 检查服务状态
EOF

    print_success "部署信息已生成: DEPLOYMENT_INFO.md"
}

# 主函数
main() {
    print_status "Convai Web v3 自动部署脚本"
    print_status "=============================="
    
    # 检查参数
    DEPLOY_TYPE=${1:-"local"}
    
    case $DEPLOY_TYPE in
        "docker")
            print_status "选择 Docker 部署模式"
            ;;
        "local")
            print_status "选择本地部署模式"
            ;;
        *)
            print_error "无效的部署类型: $DEPLOY_TYPE"
            print_status "使用方法: $0 [docker|local]"
            exit 1
            ;;
    esac
    
    # 执行部署流程
    check_requirements
    install_dependencies
    build_frontend
    test_build
    
    if [ "$DEPLOY_TYPE" = "docker" ]; then
        deploy_docker
    else
        deploy_local
    fi
    
    generate_deployment_info
    
    print_success "🎉 部署完成！"
    print_status "请查看 DEPLOYMENT_INFO.md 获取详细信息"
}

# 执行主函数
main "$@"
