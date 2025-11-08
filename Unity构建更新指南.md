# 🔄 Unity WebGL 构建更新指南

## 快速更新流程

### 方法 1: 使用自动化脚本（推荐）

1. **在 Unity 中构建 WebGL**
   - 打开你的 Unity 项目
   - `File → Build Settings → WebGL → Build`
   - 选择输出目录（如 `C:\UnityBuild`）

2. **运行更新脚本**
   ```cmd
   cd C:\Convai\ConvaiWbe_v3\scripts
   update-unity-build.bat "C:\UnityBuild"
   ```

3. **重启服务器**
   ```cmd
   # 关闭当前服务器（Ctrl+C）
   # 重新启动
   cd C:\Convai\ConvaiWbe_v3
   启动项目.cmd
   ```

4. **清除浏览器缓存**
   - 按 `Ctrl + Shift + R` 强制刷新
   - 或在浏览器设置中清除缓存

### 方法 2: 手动更新

#### 步骤 1: 备份现有构建

```powershell
cd C:\Convai\ConvaiWbe_v3\frontend\public
Copy-Item unity-build unity-build-backup -Recurse
```

#### 步骤 2: 替换 Build 文件夹

1. 删除旧的 `frontend\public\unity-build\Build\` 文件夹
2. 从 Unity 构建输出复制新的 `Build\` 文件夹到 `frontend\public\unity-build\`

#### 步骤 3: 更新其他文件（可选）

如果你修改了 Unity 模板或资源：

```
unity-build/
├── Build/              ← 每次都要更新
│   ├── *.data          ← 游戏数据
│   ├── *.wasm          ← WebAssembly 代码
│   ├── *.framework.js  ← Unity 框架
│   └── *.loader.js     ← 加载器
├── TemplateData/       ← 仅在修改模板时更新
│   └── ...
└── index.html          ← ⚠️ 不要覆盖！包含 React 通信代码
```

**重要：不要覆盖 `index.html`！**  
现有的 `index.html` 包含 Unity-React 通信桥接代码。

## Unity 项目配置检查清单

在构建之前，确保：

### ✅ 必需文件已添加

- [ ] `Assets/Plugins/WebGL/ConvaiWebBridge.jslib` 存在
- [ ] C# 脚本包含以下代码：

```csharp
#if UNITY_WEBGL && !UNITY_EDITOR
[DllImport("__Internal")]
private static extern void callWebFunction(string jsonData);

[DllImport("__Internal")]
private static extern int isWebFunctionAvailable();
#endif

// 接收来自 React 的输入
public void InjectWebInput(string jsonInput)
{
    Debug.Log($"收到Web输入: {jsonInput}");
    // 你的处理逻辑...
}

// 发送数据到 React
private void SendToWeb(string type, string content)
{
#if UNITY_WEBGL && !UNITY_EDITOR
    var data = new {
        type = type,
        content = content,
        timestamp = System.DateTime.Now.ToString("HH:mm:ss")
    };
    string json = JsonUtility.ToJson(data);
    
    if (isWebFunctionAvailable() == 1)
    {
        callWebFunction(json);
    }
#endif
}
```

### ✅ WebGL 构建设置

1. **Player Settings**:
   - WebGL Template: `Default` 或 `Minimal`
   - Compression Format: `Gzip` (推荐) 或 `Brotli`
   - Exception Support: `Explicitly Thrown Exceptions Only`

2. **Publishing Settings**:
   - Enable Exceptions: `None` (生产环境)
   - Data caching: 启用

3. **Other Settings**:
   - Strip Engine Code: 启用（减小体积）
   - IL2CPP Code Generation: `Faster (smaller) builds`

## 常见问题

### ❌ 问题 1: 浏览器显示旧版本

**原因**: 浏览器缓存

**解决**:
```
1. 按 Ctrl + Shift + R 强制刷新
2. 或清除浏览器缓存
3. 或在开发者工具中勾选 "Disable cache"
```

### ❌ 问题 2: Unity 实例无法加载

**原因**: 文件不完整或路径错误

**解决**:
1. 检查 `Build` 文件夹是否包含所有文件：
   - `*.data`
   - `*.wasm`
   - `*.framework.js`
   - `*.loader.js`

2. 打开浏览器控制台查看错误信息

3. 验证文件路径：
   ```
   frontend/public/unity-build/Build/YourGame.data
   frontend/public/unity-build/Build/YourGame.wasm
   ...
   ```

### ❌ 问题 3: React-Unity 通信失败

**原因**: `.jslib` 文件未包含在构建中

**解决**:
1. 确保 `ConvaiWebBridge.jslib` 在 `Assets/Plugins/WebGL/`
2. 重新构建 Unity 项目
3. 检查 Unity Console 是否有编译错误

### ❌ 问题 4: 构建文件过大

**优化建议**:

1. **Unity 侧优化**:
   - 启用 Strip Engine Code
   - 移除未使用的资源
   - 压缩纹理
   - 使用简化的着色器

2. **压缩设置**:
   - 使用 Gzip 或 Brotli 压缩
   - 启用服务器端压缩

3. **代码优化**:
   - 使用 IL2CPP 后端
   - 移除调试代码
   - Code Stripping Level: High

## 文件大小参考

典型的 Unity WebGL 构建大小：

| 组件 | 未压缩 | Gzip 压缩 |
|------|--------|-----------|
| .data | 20-50 MB | 5-15 MB |
| .wasm | 10-30 MB | 3-10 MB |
| .framework.js | 300 KB | 80 KB |
| .loader.js | 50 KB | 15 KB |

**总计**: 约 30-80 MB → 压缩后 8-25 MB

## 构建文件命名规则

Unity 构建文件以项目名称命名，例如：

```
Build/
├── MyGame.data
├── MyGame.wasm
├── MyGame.framework.js
└── MyGame.loader.js
```

确保 `index.html` 中的加载代码指向正确的文件名：

```javascript
var buildUrl = "Build";
var loaderUrl = buildUrl + "/MyGame.loader.js";
var config = {
    dataUrl: buildUrl + "/MyGame.data",
    frameworkUrl: buildUrl + "/MyGame.framework.js",
    codeUrl: buildUrl + "/MyGame.wasm",
    // ...
};
```

## 测试检查清单

更新后测试：

- [ ] Unity WebGL 加载成功
- [ ] React 聊天界面显示正常
- [ ] 能从 React 向 Unity 发送消息
- [ ] 能从 Unity 向 React 发送消息
- [ ] 键盘输入（WASD）正常工作
- [ ] 语音功能正常（如果使用）
- [ ] 控制台无错误信息

## 快速测试命令

```javascript
// 在浏览器控制台测试 Unity → React 通信
window.parent.postMessage({ 
    type: 'UNITY_OUTPUT', 
    payload: { 
        type: 'npc_text', 
        content: '测试消息', 
        npcName: 'Test NPC' 
    } 
}, '*');
```

## 版本控制建议

如果使用 Git：

```bash
# .gitignore 中添加（避免提交大文件）
frontend/public/unity-build/Build/*.data
frontend/public/unity-build/Build/*.wasm

# 或使用 Git LFS 管理大文件
git lfs track "*.data"
git lfs track "*.wasm"
```

## 自动化部署

考虑使用 CI/CD 自动化构建和部署流程：

1. Unity Cloud Build → 自动构建 WebGL
2. GitHub Actions → 自动部署到服务器
3. Webhook → 触发前端更新

---

**需要帮助？** 查看 `Unity-React集成指南.md` 了解更多详情。

