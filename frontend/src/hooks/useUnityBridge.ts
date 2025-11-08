import { useState, useEffect, useCallback, useRef } from 'react';
import { UnityMessage, UnityBridgeStatus, WebInputData, UnityOutputData } from '../types/unity.ts';

// Unity实例的全局接口
declare global {
  interface Window {
    unityInstance?: {
      SendMessage: (target: string, method: string, value: string) => void;
    };
    receiveUnityOutput?: (jsonData: string) => void;
  }
}

// 全局单例标记 - 确保整个应用只有一个消息监听器
let globalMessageListenerActive = false;
let globalMessageHandler: ((event: MessageEvent) => void) | null = null;


export const useUnityBridge = () => {
  const [status, setStatus] = useState<UnityBridgeStatus>({
    isUnityLoaded: false,
    isVoiceRecording: false,
    connectionStatus: 'connecting',
    hasUnityInstance: false,
    queuedMessages: 0
  });

  const messageQueue = useRef<UnityMessage[]>([]);
  const eventListeners = useRef<Map<string, Function[]>>(new Map());
  const processedMessages = useRef<Set<string>>(new Set());
  const isInitialized = useRef<boolean>(false);

  // 事件监听器管理
  const on = useCallback((event: string, callback: Function) => {
    if (!eventListeners.current.has(event)) {
      eventListeners.current.set(event, []);
    }
    
    const listeners = eventListeners.current.get(event);
    if (listeners) {
      listeners.push(callback);
    }
  }, []);

  const off = useCallback((event: string, callback: Function) => {
    const listeners = eventListeners.current.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    const listeners = eventListeners.current.get(event);
    
    if (listeners && listeners.length > 0) {
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`事件回调执行失败 [${event}]:`, error);
        }
      });
    }
  }, []);

  // 处理来自Unity的输出
  const handleUnityOutput = useCallback((data: UnityOutputData) => {
    // 检查数据是否有效
    if (!data || typeof data !== 'object') {
      return;
    }
    
    const { type, content, npcName } = data;

    // 生成消息唯一标识符（基于类型、内容和NPC名称）
    const cleanContent = content?.trim() || '';
    const cleanNpcName = npcName || '';
    const messageId = `${type}_${cleanNpcName}_${cleanContent}`;
    
    // 检查是否已经处理过这条消息
    if (processedMessages.current.has(messageId)) {
      return;
    }
    
    // 标记消息已处理
    processedMessages.current.add(messageId);
    
    // 延迟清理消息ID（防止短时间内的重复消息）
    setTimeout(() => {
      processedMessages.current.delete(messageId);
    }, 5000);

    // 触发对应类型的事件
    emit('unity-output', data);
    emit(`unity-${type}`, data);

    // 根据消息类型进行处理
    switch (type) {
      case 'user_text':
        emit('unity-user_text', data);
        break;
      case 'npc_text':
        emit('unity-npc_text', data);
        break;
      case 'talking_status':
        emit('unity-talking_status', data);
        break;
    }
  }, [emit]);

  // 设置全局接收函数（按照API指南格式） - 仅在非iframe环境下使用
  const setupGlobalReceiver = useCallback(() => {
    // 检查是否在iframe中运行
    const isInIframe = window !== window.parent;
    
    if (!isInIframe) {
      window.receiveUnityOutput = (jsonData: string) => {
        try {
          const data: UnityOutputData = JSON.parse(jsonData);
          console.log('📨 收到Unity输出 (全局):', data);
          handleUnityOutput(data);
        } catch (error) {
          console.error('❌ 解析Unity输出失败:', error, '原始数据:', jsonData);
        }
      };
      console.log('🔗 全局接收函数已设置 (非iframe环境)');
    } else {
      console.log('🔗 跳过全局接收函数设置 (iframe环境)');
    }
  }, [handleUnityOutput]);

  // 监听iframe消息 - 全局单例模式
  const setupMessageListener = useCallback(() => {
    // 如果已有监听器，先清除
    if (globalMessageHandler) {
      window.removeEventListener('message', globalMessageHandler);
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'UNITY_OUTPUT') {
        // 检查payload是否存在且有效
        if (event.data.payload && typeof event.data.payload === 'object') {
          handleUnityOutput(event.data.payload);
        }
      }
    };

    // 保存全局引用并标记已设置
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

  // 等待Unity实例加载完成
  const waitForUnityInstance = useCallback((): Promise<any> => {
    return new Promise((resolve, reject) => {
      const iframe = document.getElementById('unity-iframe') as HTMLIFrameElement;
      if (!iframe) {
        reject(new Error('Unity iframe未找到'));
        return;
      }

      let attempts = 0;
      const maxAttempts = 150; // 15秒超时（减少等待时间）
      
      const checkUnity = () => {
        attempts++;
        
        try {
          // 首先检查全局window.unityInstance
          if (window.unityInstance) {
            console.log('✅ Unity实例找到 (全局):', window.unityInstance);
            resolve(window.unityInstance);
            return;
          }
          
          // 跨源情况下无法读取 iframe.contentWindow；改为主动向子页Ping
          try { iframe.contentWindow?.postMessage({ type: 'UNITY_PING' }, '*'); } catch(_) {}
          
          // 每5秒输出一次进度信息
          if (attempts % 50 === 0) {
            console.log(`🔄 Unity加载中... (${Math.round(attempts/maxAttempts*100)}%)`);
          }
          
          if (attempts >= maxAttempts) {
            console.error('❌ Unity加载失败 - 可能的原因:');
            console.error('1. Unity WebGL文件缺失或损坏');
            console.error('2. 浏览器不支持WebGL');
            console.error('3. Unity构建配置问题');
            reject(new Error(`Unity加载超时 (尝试${attempts}次，等待${maxAttempts/10}秒)`));
            return;
          }
          
          // 继续等待
          setTimeout(checkUnity, 100);
          
        } catch (error) {
          console.warn('⚠️ 检查Unity实例时出错:', error);
          if (attempts >= maxAttempts) {
            reject(error);
          } else {
            setTimeout(checkUnity, 100);
          }
        }
      };

      // 开始检查
      console.log('🔄 开始等待Unity实例加载...');
      checkUnity();
    });
  }, []);

  // 发送数据到Unity（按照API指南格式）
  const sendToUnity = useCallback((inputData: WebInputData): boolean => {
    console.log('🚀 [DEBUG] sendToUnity 被调用:', inputData);
    console.log('🚀 [DEBUG] 当前状态:', status);
    
    // 未就绪：加入队列
    if (!status.isUnityLoaded) {
      console.log('⏳ Unity未就绪，消息加入队列:', inputData);
      messageQueue.current.push(inputData as any);
      setStatus(prev => ({ ...prev, queuedMessages: messageQueue.current.length }));
      return false;
    }

    const jsonData = JSON.stringify(inputData);
    console.log('📤 [DEBUG] 准备发送到Unity:', jsonData);
    console.log('📤 [DEBUG] window.unityInstance:', window.unityInstance);
    console.log('📤 [DEBUG] iframe元素:', document.getElementById('unity-iframe'));

    try {
      // 同源时可直接调用（保留向后兼容）
      if (window.unityInstance && typeof window.unityInstance.SendMessage === 'function') {
        console.log('📤 [DEBUG] 使用直接调用方式发送消息');
        window.unityInstance.SendMessage('ConvaiGRPCWebAPI', 'InjectWebInput', jsonData);
        console.log('✅ [DEBUG] 直接调用发送成功');
      } else {
        // 跨源：通过 postMessage 通知子页，由子页调用 SendMessage
        console.log('📤 [DEBUG] 使用postMessage方式发送消息');
        const iframe = document.getElementById('unity-iframe') as HTMLIFrameElement | null;
        if (iframe && iframe.contentWindow) {
          console.log('📤 [DEBUG] 找到iframe，发送postMessage');
          iframe.contentWindow.postMessage({ type: 'UNITY_INPUT', payload: jsonData }, '*');
          console.log('✅ [DEBUG] postMessage发送成功');
        } else {
          console.error('❌ [DEBUG] 找不到iframe或contentWindow');
          return false;
        }
      }
      emit('message-sent', inputData);
      console.log('✅ [DEBUG] 消息发送完成，触发message-sent事件');
      return true;
    } catch (error) {
      console.error('❌ [DEBUG] 发送数据到Unity失败:', error);
      emit('send-error', { error, inputData });
      return false;
    }
  }, [status.isUnityLoaded, emit]);

  // 发送文本消息
  const sendText = useCallback((text: string): boolean => {
    if (!text.trim()) return false;
    
    const inputData: WebInputData = {
      type: 'text',
      content: text.trim(),
      source: 'web'
    };
    
    return sendToUnity(inputData);
  }, [sendToUnity]);

  // 开始语音输入
  const startVoice = useCallback((): boolean => {
    console.log('🎤 [useUnityBridge] startVoice() 被调用');
    console.log('🎤 [useUnityBridge] 当前状态:', status);
    
    // 检查AudioContext状态并尝试恢复
    if (window.AudioContext || (window as any).webkitAudioContext) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext();
      
      if (audioContext.state === 'suspended') {
        console.log('🔊 [useUnityBridge] 尝试恢复AudioContext...');
        audioContext.resume().then(() => {
          console.log('✅ [useUnityBridge] AudioContext已恢复');
        }).catch(error => {
          console.warn('⚠️ [useUnityBridge] AudioContext恢复失败:', error);
        });
      }
    }
    
    const inputData: WebInputData = {
      type: 'voice_start',
      source: 'web'
    };
    
    console.log('🎤 [useUnityBridge] 准备发送数据到Unity:', inputData);
    
    setStatus(prev => ({ ...prev, isVoiceRecording: true }));
    const result = sendToUnity(inputData);
    console.log('🎤 [useUnityBridge] sendToUnity 返回结果:', result);
    
    return result;
  }, [sendToUnity, status]);

  // 停止语音输入
  const stopVoice = useCallback((): boolean => {
    console.log('🛑 [useUnityBridge] stopVoice() 被调用');
    
    const inputData: WebInputData = {
      type: 'voice_stop',
      source: 'web'
    };
    
    console.log('🛑 [useUnityBridge] 准备发送数据到Unity:', inputData);
    
    setStatus(prev => ({ ...prev, isVoiceRecording: false }));
    const result = sendToUnity(inputData);
    console.log('🛑 [useUnityBridge] sendToUnity 返回结果:', result);
    
    return result;
  }, [sendToUnity]);

  // 更新连接状态
  const updateConnectionStatus = useCallback((connectionStatus: UnityBridgeStatus['connectionStatus']) => {
    setStatus(prev => ({ ...prev, connectionStatus }));
    emit('connection-status-change', connectionStatus);
  }, [emit]);

  // 处理队列中的消息
  const processMessageQueue = useCallback(() => {
    if (status.isUnityLoaded && messageQueue.current.length > 0) {
      console.log(`📮 处理${messageQueue.current.length}条队列消息`);
      
      const messages = [...messageQueue.current];
      messageQueue.current = [];
      
      messages.forEach(inputData => {
        sendToUnity(inputData as WebInputData);
      });
      
      setStatus(prev => ({ ...prev, queuedMessages: 0 }));
    }
  }, [status.isUnityLoaded, sendToUnity]);

  // 初始化Unity桥接
  const initUnityBridge = useCallback(async () => {
    console.log('🔧 初始化Unity桥接...');
    updateConnectionStatus('connecting');
    
    let timeoutId: number;
    
    // 监听Unity准备就绪消息
    const handleUnityMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'UNITY_READY') {
        console.log('✅ Unity桥接收到准备就绪消息');
        
        // 清除超时定时器，避免触发传统检测
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        // 设置全局接收函数
        setupGlobalReceiver();
        
        // 更新状态
        setStatus(prev => ({ 
          ...prev, 
          isUnityLoaded: true, 
          hasUnityInstance: true,
          lastHeartbeat: new Date()
        }));
        updateConnectionStatus('connected');
        
        console.log('✅ Unity桥接初始化成功');
        
        // 处理队列中的消息
        processMessageQueue();
        
        // 触发连接成功事件
        emit('unity-connected', window.unityInstance);
        
        // 移除事件监听器
        window.removeEventListener('message', handleUnityMessage);
      } else if (event.data && event.data.type === 'UNITY_OUTPUT') {
        // 处理来自Unity iframe的输出消息
        console.log('📨 收到Unity输出 (iframe):', event.data.payload);
        // 检查payload是否存在且有效
        if (event.data.payload && typeof event.data.payload === 'object') {
          handleUnityOutput(event.data.payload);
        } else {
          console.error('❌ Unity输出消息的payload无效:', event.data.payload);
        }
      }
    };
    
    // 添加消息监听器
    window.addEventListener('message', handleUnityMessage);
    
    // 设置超时备用方案
    timeoutId = setTimeout(() => {
      window.removeEventListener('message', handleUnityMessage);
      
      // 如果30秒后仍未收到消息，尝试传统方式
      if (!status.isUnityLoaded) {
        console.log('⚠️ 未收到Unity准备消息，尝试传统检测方式...');
        waitForUnityInstance().then(unityInstance => {
          setupGlobalReceiver();
          setStatus(prev => ({ 
            ...prev, 
            isUnityLoaded: true, 
            hasUnityInstance: true,
            lastHeartbeat: new Date()
          }));
          updateConnectionStatus('connected');
          processMessageQueue();
          emit('unity-connected', unityInstance);
        }).catch(error => {
          console.error('❌ Unity桥接初始化失败:', error);
          // 即使检测失败，也尝试强制连接（用于调试）
          console.log('🔧 尝试强制连接Unity...');
          setupGlobalReceiver();
          setStatus(prev => ({ 
            ...prev, 
            isUnityLoaded: true, 
            hasUnityInstance: false, // 标记为未检测到实例但强制连接
            lastHeartbeat: new Date()
          }));
          updateConnectionStatus('connected');
          processMessageQueue();
          emit('unity-connected', null);
        });
      }
    }, 30000);
    
  }, [setupGlobalReceiver, updateConnectionStatus, processMessageQueue, emit, waitForUnityInstance, status.isUnityLoaded]);

  // 重新连接Unity
  const reconnect = useCallback(async () => {
    console.log('🔄 重新连接Unity...');
    updateConnectionStatus('connecting');
    
    try {
      await initUnityBridge();
    } catch (error) {
      console.error('❌ 重新连接失败:', error);
      throw error;
    }
  }, [initUnityBridge, updateConnectionStatus]);

  // 组件挂载时初始化
  useEffect(() => {
    // 防止重复初始化
    if (isInitialized.current) {
      console.log('🔄 Unity桥接已初始化，跳过重复初始化');
      return;
    }
    
    isInitialized.current = true;
    console.log('🔧 开始初始化Unity桥接...');
    
    initUnityBridge();
    
    // 设置iframe消息监听器
    const cleanup = setupMessageListener();

    // 清理函数
    return () => {
      console.log('🧹 清理Unity桥接...');
      if (window.receiveUnityOutput) {
        delete window.receiveUnityOutput;
      }
      eventListeners.current.clear();
      messageQueue.current = [];
      cleanup(); // 清理消息监听器
      isInitialized.current = false;
    };
  }, [initUnityBridge, setupMessageListener]);

  // 当Unity加载状态改变时处理队列
  useEffect(() => {
    if (status.isUnityLoaded) {
      // 延迟处理队列，确保Unity完全就绪
      setTimeout(() => {
        console.log('📮 Unity状态改变，延迟处理消息队列');
        processMessageQueue();
      }, 2000); // 延迟2秒确保Unity完全初始化
    }
  }, [status.isUnityLoaded, processMessageQueue]);

  // 测试通信功能
  const testConnection = useCallback(() => {
    console.log('📞 测试Unity通信...');
    console.log('🔍 当前状态:', status);
    console.log('🔍 Unity实例:', window.unityInstance);
    
    const testData: WebInputData = {
      type: 'text',
      content: 'Test message from React',
      source: 'web'
    };
    
    const success = sendToUnity(testData);
    console.log(success ? '✅ 测试消息发送成功' : '❌ 测试消息发送失败');
    return success;
  }, [sendToUnity, status]);

  // 强制设置Unity为已连接状态（用于调试）
  const forceConnect = useCallback(() => {
    console.log('🔧 强制设置Unity为已连接状态...');
    setStatus(prev => ({ 
      ...prev, 
      isUnityLoaded: true, 
      hasUnityInstance: true,
      connectionStatus: 'connected',
      lastHeartbeat: new Date()
    }));
    updateConnectionStatus('connected');
    processMessageQueue();
    emit('unity-connected', window.unityInstance);
  }, [updateConnectionStatus, processMessageQueue, emit]);


  return {
    status,
    sendText,
    startVoice,
    stopVoice,
    sendToUnity,
    reconnect,
    on,
    off,
    emit
  };
};