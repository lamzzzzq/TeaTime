# Unity-React 通信问题调试日志分析

## 问题概述
Unity WebGL应用与React前端无法正常通信，用户发送消息后NPC无回复。

## 问题根本原因分析

### 1. 主要问题：Unity实例变量作用域错误

**问题描述**：
```javascript
// 错误的代码结构
createUnityInstance(canvas, config, (progress) => {
  // ...
}).then((unityInstance) => {
  // unityInstance 只在回调函数作用域内可见
  // 全局函数无法访问这个变量
});
```

**根本原因**：
- `unityInstance`变量只在Promise回调函数的作用域内可见
- 全局的消息监听器和队列处理函数无法访问到Unity实例
- 导致所有Unity实例检查都返回`false`

### 2. 次要问题：时序问题

**问题描述**：
- React发送消息太快，Unity实例还未完全初始化
- 消息被加入队列，但队列处理函数无法访问Unity实例

## 调试日志时间线

### 阶段1：问题发现
```
[DEBUG] sendToUnity 被调用: {type: 'text', content: 'hi', source: 'web'}
[DEBUG] 当前状态: {isUnityLoaded: true, connectionStatus: 'connected', hasUnityInstance: true}
[DEBUG] window.unityInstance: undefined  // ❌ React端Unity实例未定义
[DEBUG] 使用postMessage方式发送消息
[DEBUG] postMessage发送成功
```

### 阶段2：Unity iframe接收消息
```
Unity iframe收到消息: {type: 'UNITY_INPUT', payload: '{"type":"text", "content": "hi", "source": "web"}'}
收到UNITY_INPUT消息: {"type":"text", "content": "hi", "source": "web"}
Unity实例未就绪,消息加入队列: {"type":"text", "content": "hi", "source": "web"}  // ❌ 消息被加入队列
```

### 阶段3：Unity实例创建完成（修复前）
```
✅ Unity实例已创建完成
📮 第1次尝试处理消息队列
✅ Unity实例已就绪,开始处理消息队列
处理消息队列,队列长度: 0  // ❌ 队列为空，消息丢失
Unity实例状态: false  // ❌ 关键问题：Unity实例检查失败
SendMessage方法状态: false  // ❌ SendMessage方法不可用
消息队列为空,无需处理
```

### 阶段4：问题修复后
```
✅ Unity实例已创建完成
✅ Unity实例对象: [Unity实例对象]  // ✅ 实例正确保存
✅ SendMessage方法: function  // ✅ SendMessage方法可用
📮 第1次尝试处理消息队列
✅ Unity实例已就绪,开始处理消息队列
处理消息队列,队列长度: 1  // ✅ 队列中有消息
📤 发送队列中的消息: {"type":"text", "content": "hi", "source": "web"}
✅ 队列消息发送成功: {"type":"text", "content": "hi", "source": "web"}
```

## 解决方案详解

### 1. 修复Unity实例变量作用域

**修复前**：
```javascript
// 问题：unityInstance只在回调作用域内可见
createUnityInstance(canvas, config, (progress) => {
  // ...
}).then((unityInstance) => {
  // unityInstance 只在这里可见
});
```

**修复后**：
```javascript
// 解决方案：声明全局变量
var unityInstance = null; // 全局变量

createUnityInstance(canvas, config, (progress) => {
  // ...
}).then((instance) => {
  unityInstance = instance; // 保存到全局变量
  // 现在所有函数都能访问unityInstance
});
```

### 2. 统一Unity实例检查逻辑

**修复前**：
```javascript
// 不一致的检查方式
if (typeof unityInstance !== 'undefined' && unityInstance.SendMessage) {
  // 可能失败，因为unityInstance可能是undefined
}
```

**修复后**：
```javascript
// 统一的检查方式
if (unityInstance && typeof unityInstance.SendMessage === 'function') {
  // 确保unityInstance存在且SendMessage是函数
}
```

### 3. 增强错误处理和调试

**添加的调试功能**：
```javascript
// 全局调试函数
window.checkUnityStatus = function() {
  console.log('🔍 Unity状态检查:');
  console.log('  - isUnityReady:', isUnityReady);
  console.log('  - unityInstance存在:', unityInstance !== null);
  console.log('  - unityInstance对象:', unityInstance);
  console.log('  - SendMessage方法存在:', unityInstance && typeof unityInstance.SendMessage === 'function');
  console.log('  - 消息队列长度:', messageQueue.length);
  console.log('  - 消息队列内容:', messageQueue);
};
```

## 关键学习点

### 1. JavaScript作用域问题
- Promise回调函数中的变量只在回调作用域内可见
- 需要将重要变量保存到全局作用域或通过其他方式共享

### 2. 异步初始化时序
- Unity WebGL需要时间完全初始化
- 消息队列机制是处理时序问题的有效方案

### 3. 调试策略
- 添加详细的日志记录每个关键步骤
- 提供调试函数来检查系统状态
- 使用重试机制处理不确定的初始化时间

### 4. 错误处理
- 添加try-catch块捕获SendMessage调用错误
- 提供详细的错误信息帮助诊断问题

## 最终结果

修复后，完整的消息流程：
1. React发送消息 → Unity iframe接收
2. Unity iframe检查实例状态 → 实例就绪，直接发送
3. Unity C#代码处理消息 → 生成NPC回复
4. Unity发送回复 → React接收并显示

**关键修复**：将Unity实例保存到全局变量，确保所有函数都能访问到正确的Unity实例对象。

## 本次追加修复与落地步骤（2025-09）

为适配新的 WebGL 包并解决“加载卡住 / React 端等不到就绪信号 / 缓存粘连”等问题，本次新增了如下改动：

1. 在 `frontend/public/unity-build/index.html` 中：
   - 本地开发环境禁用并注销 Service Worker，避免强缓存旧构建。
   - 为 `1.loader.js` / `1.framework.js` / `1.wasm` / `1.data` 统一追加 `?v=时间戳`，强制绕过浏览器缓存。
   - 创建全局变量 `unityInstance`、`isUnityReady`、`messageQueue`，并实现 `UNITY_INPUT`/`UNITY_OUTPUT` 双向桥接：
     - 父页 → Unity：监听 `postMessage` 的 `UNITY_INPUT`，未就绪则入队，就绪后批量 `SendMessage`。
     - Unity → 父页：实现 `window.receiveUnityOutput`，将 Unity 回传转发为 `{ type: 'UNITY_OUTPUT', payload }`。
   - 在 `createUnityInstance` 成功后：
     - 将实例挂到 `window.unityInstance`，设置 `isUnityReady = true`，并延迟处理消息队列。
     - 通过 `postMessage` 主动发送 `UNITY_READY` 给父页，确保 React 能可靠获知就绪。

2. React 侧（说明）：
   - `useUnityBridge.ts` 监听 `UNITY_READY` 与 `UNITY_OUTPUT`，统一触发 `unity-output` 事件。
   - `ChatContainer.tsx` 仅监听一次 `unity-output`，并做去重与回显。

> 验证要点：Network 面板需出现 4 个 200（带 `?v=`）；Console 应看到 “Unity实例已创建完成” 与 “已向父页面发送 UNITY_READY”。


## 相关文件修改

### 修改的文件：
- `frontend/public/unity-build/index.html` - Unity iframe消息处理
- `frontend/src/hooks/useUnityBridge.ts` - React端Unity桥接
- `frontend/src/components/ChatUI/ChatContainer.tsx` - 聊天组件

### 主要修改内容：
1. 添加全局Unity实例变量
2. 修复消息队列处理逻辑
3. 增强错误处理和调试日志
4. 统一Unity实例检查方式

## 调试命令

在浏览器控制台中可以使用以下命令进行调试：

```javascript
// 检查Unity状态
window.checkUnityStatus()

// 手动触发队列处理
window.manualProcessQueue()
```

## 总结

这个问题的核心是JavaScript作用域问题，Unity实例变量没有正确保存到全局作用域，导致消息队列处理函数无法访问Unity实例。通过将Unity实例保存到全局变量并统一检查逻辑，成功解决了通信问题。

---

## 最新问题追踪（2025年1月）

### 问题：NPC回复接收正常但未显示在聊天界面

**现象**：
- ✅ Unity WebGL 正常加载
- ✅ React-Unity 通信正常
- ✅ NPC回复数据正确接收
- ❌ NPC回复未显示在聊天记录中

**调试发现**：
从控制台日志可以看到：
```
收到Unity输出(iframe): {type: 'npc_text', content: 'I'm Professor Bryant...', npcName: 'Bryant Hui', timestamp: '02:28:39'}
[DEBUG] ChatContainer收到Unity输出事件
[DEBUG] 处理NPC回复: Bryant Hui
```

**分析**：数据流到了 `ChatContainer` 的 `handleUnityOutput` 函数，但可能在以下环节出现问题：
1. 字段映射问题（`content` vs `text` 等）
2. 重复消息过滤逻辑过于严格
3. React状态更新问题
4. UI渲染问题

**待验证解决方案**：
1. 增强调试日志，追踪消息处理的每个步骤
2. 检查重复消息过滤逻辑
3. 验证React状态更新是否正常触发
4. 检查UI组件渲染逻辑

---

## 🔖 代码备份与还原指南（2025年1月最新）

### 当前工作状态
- ✅ NPC回复正常显示
- ✅ 消息去重机制工作正常
- ✅ 调试代码已全部清理
- ✅ 界面简洁，只保留必要功能

### 关键文件修改要点

#### 1. ChatContainer.tsx 关键修改
```typescript
// 🔑 关键：事件监听器注册
useEffect(() => {
  const handleUnityOutput = (data: any) => {
    if (!data || typeof data !== 'object') return;
    
    // 统一抽取NPC文本和名称
    const pickNpcName = (d: any) => d?.npcName || d?.npc || d?.characterName || d?.name || 'NPC';
    const pickNpcText = (d: any) => {
      const possibleTexts = [
        d?.content, d?.text, d?.message, d?.transcript, 
        d?.speech?.text, d?.response, d?.reply, d?.answer
      ];
      for (const text of possibleTexts) {
        if (text && typeof text === 'string' && text.trim()) {
          return text.trim();
        }
      }
      return typeof d === 'string' && d.trim() ? d.trim() : '';
    };

    // 🔑 关键：NPC消息处理和去重
    switch (normalizedType) {
      case 'npc_text': {
        setMessages(prev => {
          const recent = prev.slice(-3);
          const duplicated = recent.some(m => 
            m.type === 'npc' && 
            m.content === npcText && 
            (m.npcName || 'NPC') === npcName
          );
          if (duplicated) return prev;

          // 添加新消息并滚动到底部
          const newMessages = [...prev, newMessage];
          setTimeout(() => {
            const messagesEnd = document.querySelector('.messages-container');
            if (messagesEnd) {
              messagesEnd.scrollTop = messagesEnd.scrollHeight;
            }
          }, 100);
          return newMessages;
        });
      }
    }
  };

  // 🔑 关键：事件监听器注册（依赖unityBridge确保热重载后重新注册）
  unityBridge.on('unity-output', handleUnityOutput);
  unityBridge.on('unity-npc_text', handleUnityOutput as any);

  return () => {
    unityBridge.off('unity-output', handleUnityOutput);
    unityBridge.off('unity-npc_text', handleUnityOutput as any);
  };
}, [unityBridge]); // 🔑 关键：依赖unityBridge
```

#### 2. useUnityBridge.ts 关键修改
```typescript
// 🔑 关键：全局消息监听器单例模式
let globalMessageListenerActive = false;
let globalMessageHandler: ((event: MessageEvent) => void) | null = null;

// 🔑 关键：Unity输出处理和去重
const handleUnityOutput = useCallback((data: UnityOutputData) => {
  if (!data || typeof data !== 'object') return;
  
  const { type, content, npcName } = data;
  
  // 🔑 关键：消息去重机制
  const messageId = `${type}_${npcName || ''}_${content?.trim() || ''}`;
  if (processedMessages.current.has(messageId)) return;
  
  processedMessages.current.add(messageId);
  setTimeout(() => {
    processedMessages.current.delete(messageId);
  }, 5000);

  // 🔑 关键：事件触发
  emit('unity-output', data);
  emit(`unity-${type}`, data);
}, [emit]);

// 🔑 关键：iframe消息监听设置
const setupMessageListener = useCallback(() => {
  if (globalMessageHandler) {
    window.removeEventListener('message', globalMessageHandler);
  }

  const handleMessage = (event: MessageEvent) => {
    if (event.data && event.data.type === 'UNITY_OUTPUT') {
      if (event.data.payload && typeof event.data.payload === 'object') {
        handleUnityOutput(event.data.payload);
      }
    }
  };

  globalMessageHandler = handleMessage;
  globalMessageListenerActive = true;
  window.addEventListener('message', handleMessage);

  return () => {
    if (globalMessageHandler) {
      window.removeEventListener('message', globalMessageHandler);
      globalMessageHandler = null;
      globalMessageListenerActive = false;
    }
  };
}, [handleUnityOutput]);
```

#### 3. Unity iframe (index.html) 关键修改
```javascript
// 🔑 关键：全局变量声明
var unityInstance = null;
var isUnityReady = false;
var messageQueue = [];

// 🔑 关键：Unity输出函数（供C#调用）
window.receiveUnityOutput = function (jsonData) {
  try {
    var payload = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    if (window.parent && window.parent.postMessage) {
      window.parent.postMessage({ 
        type: 'UNITY_OUTPUT', 
        payload: payload 
      }, '*');
    }
  } catch (error) {
    console.error('[Unity iframe] receiveUnityOutput 解析失败:', error);
  }
};

// 🔑 关键：消息监听器
window.addEventListener('message', function (event) {
  var data = event && event.data;
  if (!data || data.type !== 'UNITY_INPUT') return;
  
  var payload = typeof data.payload === 'string' ? data.payload : JSON.stringify(data.payload);
  
  if (unityInstance && typeof unityInstance.SendMessage === 'function') {
    try {
      unityInstance.SendMessage('ConvaiGRPCWebAPI', 'InjectWebInput', payload);
    } catch (error) {
      console.error('[Unity iframe] SendMessage 失败:', error);
    }
  } else {
    messageQueue.push(payload);
  }
});

// 🔑 关键：Unity实例创建后的处理
createUnityInstance(canvas, config, (progress) => {
  progressBarFull.style.width = 100 * progress + "%";
}).then((instance) => {
  loadingBar.style.display = "none";
  
  // 🔑 关键：保存到全局变量
  unityInstance = instance;
  isUnityReady = true;
  
  // 🔑 关键：延迟处理消息队列
  setTimeout(function() {
    processMessageQueue();
  }, 500);
  
  // 🔑 关键：发送就绪信号
  try {
    if (window.parent && window.parent.postMessage) {
      window.parent.postMessage({ 
        type: 'UNITY_READY', 
        payload: { ready: true } 
      }, '*');
    }
  } catch (error) {
    console.error('[Unity iframe] 发送UNITY_READY失败:', error);
  }
});

// 🔑 关键：Unity构建文件配置（需要根据实际文件名修改）
var buildUrl = "Build";
var timestamp = Date.now();
var loaderUrl = buildUrl + "/Bryant.loader.js?v=" + timestamp;
var config = {
  dataUrl: buildUrl + "/Bryant.data?v=" + timestamp,
  frameworkUrl: buildUrl + "/Bryant.framework.js?v=" + timestamp,
  codeUrl: buildUrl + "/Bryant.wasm?v=" + timestamp,
  // ... 其他配置
};
```

### 🚀 快速还原步骤

当你更换Unity build文件后，需要执行以下步骤：

1. **更新Unity文件名**：
   - 在 `index.html` 中修改 `Bryant.*` 为新的文件名
   - 确保 `loaderUrl` 和 `config` 中的文件名一致

2. **确认桥接代码完整**：
   - 检查 `window.receiveUnityOutput` 函数存在
   - 检查消息监听器和队列处理函数存在
   - 检查Unity实例保存到全局变量的逻辑存在

3. **验证关键功能**：
   - Unity加载完成后控制台应显示 "已向父页面发送 UNITY_READY"
   - React应收到Unity输出并正确显示NPC回复
   - 消息去重机制应正常工作

### 🔧 常见问题和解决方案

1. **Unity文件404错误**：
   - 检查文件名是否正确
   - 确认 `?v=timestamp` 缓存清除参数存在

2. **NPC回复不显示**：
   - 检查 `window.receiveUnityOutput` 是否被正确调用
   - 检查React事件监听器是否正确注册

3. **消息重复**：
   - 确认去重逻辑在两个层面都存在（useUnityBridge和ChatContainer）

---

*文档创建时间：2024年12月*
*最后更新：2025年1月*
*问题解决状态：✅ 已解决并记录完整还原方案*
