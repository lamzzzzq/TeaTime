# Convai Web v3 部署指南

## 项目结构

```
ConvaiWeb_v3/
├── frontend/          # React前端应用
│   ├── src/           # React源码
│   ├── public/        # 静态资源
│   ├── scripts/       # 启动脚本
│   └── package.json   # 前端依赖配置
├── backend/           # Node.js后端服务
│   ├── server.js      # 后端服务器
│   └── package.json   # 后端依赖配置
└── README.md          # 项目说明
```

## GitHub部署步骤

### 1. 初始化Git仓库

```bash
# 在项目根目录执行
git init
git add .
git commit -m "Initial commit: Convai Web v3 project structure"
```

### 2. 创建GitHub仓库

1. 访问 [GitHub](https://github.com)
2. 点击 "New repository"
3. 仓库名称：`ConvaiWeb_v3` 或你喜欢的名称
4. 选择 Public 或 Private
5. 不要勾选 "Initialize this repository with a README"
6. 点击 "Create repository"

### 3. 连接远程仓库

```bash
# 替换 YOUR_USERNAME 和 REPO_NAME
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
git branch -M main
git push -u origin main
```

## 部署配置

### 前端部署 (Netlify)

1. **连接GitHub仓库**
2. **构建设置：**
   - Build command: `cd frontend && npm install && npm run build`
   - Publish directory: `frontend/build`
   - Base directory: 留空

3. **环境变量：**
   ```
   REACT_APP_API_URL=https://your-backend-url.railway.app
   ```

### 后端部署 (Railway)

1. **连接GitHub仓库**
2. **部署设置：**
   - Source Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`

3. **环境变量：**
   ```
   NODE_ENV=production
   PORT=3000
   CORS_ORIGIN=https://your-frontend-url.netlify.app
   ```

## 注意事项

### Unity WebGL文件

- Unity构建文件已被`.gitignore`排除（文件较大）
- 部署时需要手动上传到服务器
- 或者使用CDN托管Unity文件

### 环境变量

- 不要将敏感信息提交到Git
- 使用环境变量文件或部署平台的环境变量功能
- 开发环境使用`.env.local`文件

### 依赖管理

- 前端依赖：`frontend/package.json`
- 后端依赖：`backend/package.json`
- 确保两个目录都有完整的依赖配置

## 常见问题

### Q: Unity文件太大无法上传？
A: 使用`.gitignore`排除，部署时手动上传或使用CDN

### Q: 前后端如何通信？
A: 通过环境变量配置API地址，确保CORS设置正确

### Q: 如何更新部署？
A: 推送代码到GitHub主分支，Netlify和Railway会自动重新部署

## 维护建议

1. **定期更新依赖**
2. **监控部署状态**
3. **备份重要配置**
4. **测试部署流程**
