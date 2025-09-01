#!/bin/bash

# GitHub 仓库完全同步脚本
# 用于将本地项目完全覆盖到GitHub仓库

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 打印函数
print_info() {
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

print_header() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                  GitHub 仓库完全同步                         ║"
    echo "║              将本地项目完全覆盖到GitHub                      ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# 检查Git是否安装
check_git() {
    if ! command -v git &> /dev/null; then
        print_error "Git 未安装，请先安装 Git"
        exit 1
    fi
}

# 检查是否在Git仓库中
check_git_repo() {
    if [ ! -d ".git" ]; then
        print_error "当前目录不是Git仓库"
        echo
        print_warning "需要先初始化Git仓库"
        
        read -p "请输入GitHub仓库地址: " repo_url
        
        if [ -n "$repo_url" ]; then
            print_info "正在克隆仓库..."
            git clone "$repo_url" temp_repo
            
            print_info "正在合并文件..."
            cp -r temp_repo/.git .
            rm -rf temp_repo
            
            print_success "仓库连接完成"
        else
            print_info "初始化新的Git仓库..."
            git init
            print_success "Git仓库初始化完成"
            echo
            print_warning "请手动添加远程仓库："
            echo "git remote add origin https://github.com/用户名/仓库名.git"
            exit 1
        fi
    fi
}

# 检查远程仓库
check_remote() {
    if ! git remote get-url origin &> /dev/null; then
        print_warning "没有配置远程仓库"
        read -p "请输入GitHub仓库地址: " repo_url
        git remote add origin "$repo_url"
        print_success "远程仓库已添加"
    fi
}

# 显示当前状态
show_status() {
    print_info "当前Git状态："
    echo "=================="
    
    echo -e "${YELLOW}远程仓库：${NC}"
    git remote -v
    
    echo
    echo -e "${YELLOW}当前分支：${NC}"
    git branch --show-current 2>/dev/null || echo "main"
    
    echo
    echo -e "${YELLOW}文件状态：${NC}"
    git status --short
}

# 执行同步
sync_to_github() {
    print_info "开始同步过程..."
    echo "====================="
    
    # 步骤1：添加所有文件
    print_warning "步骤1: 添加所有文件..."
    git add .
    print_success "文件添加完成"
    
    # 步骤2：提交更改
    print_warning "步骤2: 提交更改..."
    commit_msg="Update: 完全同步项目文件 - $(date)"
    if git commit -m "$commit_msg"; then
        print_success "提交完成"
    else
        print_warning "没有新的更改需要提交"
    fi
    
    # 步骤3：获取远程最新状态
    print_warning "步骤3: 获取远程状态..."
    if git fetch origin; then
        print_success "远程状态获取完成"
    else
        print_warning "获取远程状态失败，可能是首次推送"
    fi
    
    # 步骤4：强制推送
    print_warning "步骤4: 强制推送到GitHub..."
    print_error "⚠️  正在执行强制推送，这将完全覆盖GitHub上的内容"
    
    if git push origin main --force; then
        print_success "推送到main分支成功"
    elif git push origin master --force; then
        print_success "推送到master分支成功"
    else
        print_error "推送失败"
        echo
        print_warning "可能的解决方案："
        echo "1. 检查网络连接"
        echo "2. 检查GitHub仓库权限"
        echo "3. 检查仓库地址是否正确"
        echo
        echo -e "${CYAN}当前远程仓库：${NC}"
        git remote -v
        exit 1
    fi
}

# 显示结果
show_result() {
    echo
    print_success "🎉 同步完成！"
    echo "=================="
    
    echo
    echo -e "${CYAN}📊 同步结果：${NC}"
    echo "• 本地所有文件已上传到GitHub"
    echo "• GitHub上的旧文件已被清理"
    echo "• 项目结构完全同步"
    
    echo
    echo -e "${CYAN}🔗 接下来可以：${NC}"
    echo "1. 访问您的GitHub仓库查看文件"
    echo "2. 使用Netlify部署项目"
    echo "3. 分享项目链接给其他人"
    
    echo
    echo -e "${YELLOW}GitHub仓库地址：${NC}"
    git config --get remote.origin.url
    
    echo
    read -p "是否现在打开Netlify进行部署？(y/n): " open_netlify
    
    if [[ $open_netlify =~ ^[Yy]$ ]]; then
        print_info "正在打开Netlify..."
        
        # 尝试不同的打开方式
        if command -v xdg-open &> /dev/null; then
            xdg-open https://app.netlify.com/start
        elif command -v open &> /dev/null; then
            open https://app.netlify.com/start
        else
            echo "请手动访问: https://app.netlify.com/start"
        fi
        
        echo
        echo -e "${CYAN}Netlify部署步骤：${NC}"
        echo "1. 点击 'New site from Git'"
        echo "2. 选择 'GitHub'"
        echo "3. 选择您的仓库"
        echo "4. 配置构建设置："
        echo -e "   - Base directory: ${YELLOW}frontend${NC}"
        echo -e "   - Build command: ${YELLOW}npm run build${NC}"
        echo -e "   - Publish directory: ${YELLOW}frontend/build${NC}"
        echo "5. 点击 'Deploy site'"
    fi
}

# 主函数
main() {
    print_header
    
    echo -e "${YELLOW}⚠️  注意：此操作将会：${NC}"
    echo "  • 完全覆盖GitHub仓库的内容"
    echo "  • 删除GitHub上已不存在于本地的文件"
    echo "  • 添加本地所有新文件"
    echo "  • 保持完全同步"
    echo
    
    read -p "确认要完全同步到GitHub吗？(y/n): " confirm
    
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        print_warning "操作已取消"
        exit 0
    fi
    
    check_git
    check_git_repo
    check_remote
    show_status
    
    echo
    read -p "继续执行同步？(y/n): " continue_sync
    
    if [[ $continue_sync =~ ^[Yy]$ ]]; then
        sync_to_github
        show_result
        
        echo
        print_success "✨ 完成！您的项目现在已完全同步到GitHub"
    else
        print_warning "同步已取消"
    fi
}

# 执行主函数
main "$@"
