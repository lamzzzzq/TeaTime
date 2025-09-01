# 多阶段构建 Dockerfile
# 阶段1: 构建前端
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# 复制前端依赖文件
COPY frontend/package*.json ./
RUN npm ci --only=production

# 复制前端源码并构建
COPY frontend/ ./
RUN npm run build

# 阶段2: 设置后端和最终镜像
FROM node:18-alpine AS production

# 安装必要的系统依赖
RUN apk add --no-cache \
    curl \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# 复制后端依赖文件
COPY backend/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# 复制后端源码
COPY backend/ ./

# 从前端构建阶段复制构建产物
COPY --from=frontend-builder /app/frontend/build ./public

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S convai -u 1001

# 更改文件所有权
RUN chown -R convai:nodejs /app
USER convai

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# 启动应用
CMD ["npm", "start"]
