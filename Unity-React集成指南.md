# Unity WebGL + React 集成完整指南

## 🎯 概述

本指南将帮助你完成Unity WebGL项目与React前端的完整集成，实现双向通信功能。

## 📋 前置条件

- Unity 2021.3 或更高版本
- Node.js 16+ 和 npm
- 现代浏览器（支持WebGL和麦克风API）

## 🚀 集成步骤

### 第一步：Unity项目配置

#### 1.1 添加WebGL桥接文件

1. 在Unity项目中创建目录：`Assets/Plugins/WebGL/`
2. 将 `ConvaiWebBridge.jslib` 文件放入该目录
3. 将 `ConvaiWebBridgeExample.cs` 脚本添加到项目中

#### 1.2 配置Unity脚本

```csharp
// 在你的Convai脚本中添加以下代码

#if UNITY_WEBGL && !UNITY_EDITOR
[DllImport("__Internal")]
private static extern void callWebFunction(string jsonData);

[DllImport("__Internal")]
private static extern int isWebFunctionAvailable();
#endif

// 接收网页输入的方法
public void InjectWebInput(string jsonInput)
{
    try 
    {
        WebInputData inputData = JsonUtility.FromJson<WebInputData>(jsonInput);
        
        switch (inputData.type)
        {
            case "text":
                // 处理文本输入
                ProcessTextInput(inputData.content);
                break;
            case "voice_start":
                // 开始语音录制
                StartVoiceRecording();
                break;
            case "voice_stop":
                // 停止语音录制
                StopVoiceRecording();
                break;
        }
    }
    catch (System.Exception e)
    {
        Debug.LogError($"处理网页输入失败: {e.Message}");
    }
}

// 发送输出到网页的方法
private void SendOutputToWeb(string type, string content, string npcName = "")
{
    var outputData = new {
        type = type,
        content = content,
        npcName = npcName,
        timestamp = System.DateTime.Now.ToString("HH:mm:ss"),
        additionalData = new { isTalking = false }
    };
    
    string jsonOutput = JsonUtility.ToJson(outputData);
    
#if UNITY_WEBGL && !UNITY_EDITOR
    if (isWebFunctionAvailable() == 1)
    {
        callWebFunction(jsonOutput);
    }
#endif
}
```

#### 1.3 Unity WebGL构建设置

1. 打开 **File → Build Settings**
2. 选择 **WebGL** 平台
3. 在 **Player Settings** 中：
   - 设置 **WebGL Template** 为 **Default** 或 **Minimal**
   - 启用 **Compression Format** 为 **Gzip**
   - 设置 **Exception Support** 为 **Explicitly Thrown Exceptions Only**
4. 点击 **Build** 并选择输出目录

### 第二步：React项目集成

#### 2.1 项目结构

确保你的React项目具有以下结构：

```
convai-react-project/
├── public/
│   ├── unity-build/          # Unity WebGL构建文件
│   │   ├── index.html
│   │   ├── Build/
│   │   └── TemplateData/
│   └── index.html
├── src/
│   ├── types/
│   │   └── unity.ts          # Unity类型定义
│   ├── hooks/
│   │   └── useUnityBridge.ts # Unity通信Hook
│   ├── components/
│   │   ├── UnityContainer.tsx
│   │   └── ChatUI/
│   └── App.tsx
└── package.json
```

#### 2.2 复制Unity构建文件

1. 将Unity构建的所有文件复制到 `public/unity-build/` 目录
2. 确保包含以下文件：
   - `index.html`
   - `Build/` 文件夹（包含 .data, .wasm, .js 文件）
   - `TemplateData/` 文件夹

#### 2.3 修改Unity的index.html

在 `public/unity-build/index.html` 中确保Unity canvas具有正确的tabindex：

```html
<canvas id="unity-canvas" width=960 height=600 tabindex="0"></canvas>
```

并在Unity加载完成后添加焦点设置：

```javascript
createUnityInstance(canvas, config).then((unityInstance) => {
    // 确保Unity Canvas获得焦点以接收键盘输入
    canvas.focus();
    
    // 添加点击事件监听器
    canvas.addEventListener('click', function() {
        canvas.focus();
    });
    
    // 防止页面滚动干扰WASD键
    canvas.addEventListener('keydown', function(e) {
        if([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
            e.preventDefault();
        }
    });
});
```

### 第三步：启动和测试

#### 3.1 启动React开发服务器

```bash
# 安装依赖
npm install

# 启动前端
npm start
```

#### 3.2 启动后端服务器

```bash
# 进入backend目录
cd backend

# 安装依赖
npm install

# 启动后端
npm run dev
```

#### 3.3 测试通信

1. 打开浏览器访问 `http://localhost:3000`
2. 等待Unity WebGL加载完成
3. 在聊天界面输入文本消息
4. 点击测试通信按钮（📞）
5. 检查浏览器控制台的日志输出

## 🔧 API参考

### React → Unity 通信

#### 发送文本消息
```javascript
const inputData = {
    type: "text",
    content: "Hello Unity!",
    source: "web"
};

unityInstance.SendMessage('ConvaiGRPCWebAPI', 'InjectWebInput', JSON.stringify(inputData));
```

#### 开始语音输入
```javascript
const inputData = {
    type: "voice_start",
    source: "web"
};

unityInstance.SendMessage('ConvaiGRPCWebAPI', 'InjectWebInput', JSON.stringify(inputData));
```

#### 停止语音输入
```javascript
const inputData = {
    type: "voice_stop",
    source: "web"
};

unityInstance.SendMessage('ConvaiGRPCWebAPI', 'InjectWebInput', JSON.stringify(inputData));
```

### Unity → React 通信

Unity通过调用 `window.receiveUnityOutput(jsonData)` 函数向React发送数据：

#### 用户文本输入（包括语音转录）
```json
{
    "type": "user_text",
    "content": "用户输入的文本",
    "timestamp": "14:30:25"
}
```

#### NPC回复
```json
{
    "type": "npc_text",
    "content": "NPC的回复内容",
    "npcName": "AI助手",
    "timestamp": "14:30:26"
}
```

#### NPC说话状态
```json
{
    "type": "talking_status",
    "content": "开始说话",
    "npcName": "AI助手",
    "timestamp": "14:30:27",
    "additionalData": {
        "isTalking": true
    }
}
```

## 🛠️ 常见问题解决

### 问题1：Unity实例未找到

**症状**：控制台显示 "Unity实例加载超时"

**解决方案**：
1. 检查Unity构建文件是否完整
2. 确保网络连接正常（Unity WebGL需要下载资源）
3. 检查浏览器控制台是否有JavaScript错误
4. 尝试在不同浏览器中测试

### 问题2：WASD键不响应

**症状**：Unity游戏中WASD移动键无效

**解决方案**：
1. 确保Unity canvas设置了 `tabindex="0"`
2. 添加自动焦点和点击焦点代码
3. 添加键盘事件防止默认行为的代码

### 问题3：通信失败

**症状**：React和Unity之间无法通信

**解决方案**：
1. 检查 `.jslib` 文件是否正确放置在 `Assets/Plugins/WebGL/`
2. 确保Unity脚本中的 `DllImport` 声明正确
3. 检查JavaScript全局函数 `window.receiveUnityOutput` 是否已定义
4. 查看浏览器控制台的错误信息

### 问题4：麦克风权限问题

**症状**：语音功能无法使用

**解决方案**：
1. 确保使用HTTPS协议（本地开发可用HTTP）
2. 检查浏览器麦克风权限设置
3. 测试浏览器是否支持 `navigator.mediaDevices.getUserMedia`

## 📊 性能优化建议

### Unity侧优化
1. **减小构建大小**：
   - 使用 **IL2CPP** 后端
   - 启用 **Strip Engine Code**
   - 移除未使用的资源

2. **优化渲染**：
   - 降低纹理质量
   - 使用简化的着色器
   - 减少多边形数量

### React侧优化
1. **懒加载Unity**：
   - 仅在需要时加载Unity WebGL
   - 显示加载进度

2. **内存管理**：
   - 及时清理事件监听器
   - 避免内存泄漏

## 🔍 调试技巧

### Unity调试
```csharp
// 在Unity中发送调试信息到浏览器控制台
#if UNITY_WEBGL && !UNITY_EDITOR
sendDebugLog("Debug message from Unity", 0);
#endif
```

### React调试
```javascript
// 监听所有Unity消息
window.receiveUnityOutput = function(jsonData) {
    console.log('收到Unity消息:', jsonData);
    // 处理消息...
};
```

### 浏览器调试
1. 打开浏览器开发者工具
2. 查看Console标签页的日志输出
3. 使用Network标签页检查资源加载
4. 使用Application标签页检查存储和权限

## 📝 部署注意事项

### 生产环境部署
1. **HTTPS要求**：生产环境必须使用HTTPS
2. **CORS配置**：确保后端API支持跨域请求
3. **Gzip压缩**：启用服务器Gzip压缩以减小文件大小
4. **CDN加速**：将Unity WebGL文件部署到CDN

### 服务器配置
```nginx
# Nginx配置示例
location /unity-build/ {
    # 设置正确的MIME类型
    location ~ \.unityweb$ {
        add_header Content-Encoding gzip;
        add_header Content-Type application/octet-stream;
    }
    
    # 启用缓存
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 🎉 完成！

按照以上步骤，你应该能够成功集成Unity WebGL和React，实现完整的双向通信功能。

如果遇到问题，请检查：
1. 浏览器控制台的错误信息
2. Unity构建日志
3. 网络请求状态
4. 文件路径和权限

祝你集成成功！🚀
