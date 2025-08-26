# Convai React 智能对话系统

基于React + Unity WebGL的智能对话系统，支持文字和语音交互。

## 🏗️ 项目架构

- **前端**: React 18 + TypeScript
- **后端**: Node.js + Express (API服务器)
- **Unity**: WebGL构建集成
- **通信**: React ↔ Unity 双向通信

## 🚀 快速启动

### 方法1: 使用启动脚本 (推荐)

**Windows:**
```bash
# 双击运行或在命令行执行
启动项目.cmd
# 或者
启动服务器.bat
```

**Linux/macOS:**
```bash
# 进入前端目录
cd frontend
# 给脚本执行权限并运行
chmod +x scripts/start-react-dev.sh
./scripts/start-react-dev.sh
```

### 方法2: 手动启动

1. **安装依赖**
```bash
# 安装前端依赖
cd frontend
npm install

# 安装后端依赖
cd ../backend
npm install
```

2. **启动后端服务器**
```bash
cd backend
npm start
# 后端服务器运行在 http://localhost:3001
```

3. **启动React开发服务器** (新终端)
```bash
cd frontend
npm start
# React应用运行在 http://localhost:3000
```

## 📁 项目结构

```
ConvaiWeb_v3/
├── frontend/                 # React前端应用
│   ├── package.json         # 前端依赖配置
│   ├── public/              # 静态资源
│   │   ├── index.html      # HTML模板
│   │   └── unity-build/    # Unity WebGL构建文件
│   ├── src/                # React源码
│   │   ├── components/     # React组件
│   │   ├── hooks/         # 自定义Hooks
│   │   ├── styles/        # CSS样式
│   │   └── types/         # TypeScript类型
│   └── scripts/           # 启动脚本
├── backend/                # 后端API服务器
│   ├── package.json       # 后端依赖配置
│   └── server.js          # Express服务器
├── .gitignore             # Git忽略文件
├── DEPLOYMENT.md          # 部署指南
└── README.md              # 项目说明
```

## 🔄 双向通信

### React → Unity
```typescript
const { sendText } = useUnityBridge();
sendText("Hello Unity!");
```

### Unity → React
```javascript
// Unity调用全局函数
window.receiveUnityOutput(JSON.stringify({
  type: 'npc_text',
  content: 'Hello React!',
  npcName: 'AI助手'
}));
```

## 🎮 Unity集成

1. 在Unity中构建WebGL版本
2. 将构建文件复制到 `frontend/public/unity-build/` 目录
3. 确保包含以下文件：
   - `index.html` (Unity主页面)
   - `Build/` 文件夹 (构建资源)
4. 重启开发服务器

> 💡 即使没有真实的Unity构建文件，系统也提供了模拟环境用于测试。

## 🛠️ 可用脚本

- `cd frontend && npm start` - 启动React开发服务器
- `cd frontend && npm run build` - 构建生产版本
- `cd frontend && npm test` - 运行测试
- `cd backend && npm start` - 启动后端服务器

## 🌐 访问地址

- **React应用**: http://localhost:3000
- **后端API**: http://localhost:3001
- **健康检查**: http://localhost:3001/api/health

## 🚀 部署

### GitHub部署
1. 初始化Git仓库：`git init`
2. 添加文件：`git add .`
3. 提交更改：`git commit -m "Initial commit"`
4. 推送到GitHub：`git push origin main`

### 生产环境部署
- **前端**: 部署到Netlify
- **后端**: 部署到Railway
- **详细步骤**: 参考 `DEPLOYMENT.md`

## ✨ 功能特性

- ✅ 现代化React架构
- ✅ TypeScript类型安全
- ✅ Unity WebGL集成
- ✅ 双向通信支持
- ✅ 聊天UI界面
- ✅ 语音输入支持
- ✅ 实时状态管理
- ✅ 响应式设计
- ✅ 热重载开发

## 🔧 开发环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0
- 现代浏览器 (支持ES6+)

## 📚 文档

- [部署指南](./DEPLOYMENT.md) - 详细的部署说明
- [Unity集成指南](./Unity-React集成指南.md) - Unity集成说明

---

**Powered by React + Unity WebGL + Convai** 🚀
