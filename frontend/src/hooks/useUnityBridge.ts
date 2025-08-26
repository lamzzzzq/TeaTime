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

  // 事件监听器管理
  const on = useCallback((event: string, callback: Function) => {
    if (!eventListeners.current.has(event)) {
      eventListeners.current.set(event, []);
    }
    eventListeners.current.get(event)?.push(callback);
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
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ 事件回调执行失败 [${event}]:`, error);
        }
      });
    }
  }, []);

  // 处理来自Unity的输出（按照API指南格式）
  const handleUnityOutput = useCallback((data: UnityOutputData) => {
    const { type, content, npcName, timestamp, additionalData } = data;

    // 触发对应类型的事件
    emit('unity-output', data);
    emit(`unity-${type}`, data);

    // 根据消息类型进行处理
    switch (type) {
      case 'user_text':
        console.log('👤 用户输入（包括语音转录）:', content);
        break;
      case 'npc_text':
        console.log('🤖 NPC回复:', npcName, content);
        break;
      case 'talking_status':
        const isTalking = additionalData?.isTalking || false;
        console.log(`🗣️ NPC ${isTalking ? '开始' : '停止'}说话:`, npcName);
        break;
      default:
        console.log('📝 未知Unity输出类型:', type, data);
    }
  }, [emit]);

  // 设置全局接收函数（按照API指南格式）
  const setupGlobalReceiver = useCallback(() => {
    window.receiveUnityOutput = (jsonData: string) => {
      try {
        const data: UnityOutputData = JSON.parse(jsonData);
        console.log('📨 收到Unity输出:', data);
        handleUnityOutput(data);
      } catch (error) {
        console.error('❌ 解析Unity输出失败:', error, '原始数据:', jsonData);
      }
    };
    console.log('🔗 全局接收函数已设置');
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
    // 未就绪：加入队列
    if (!status.isUnityLoaded) {
      console.log('⏳ Unity未就绪，消息加入队列:', inputData);
      messageQueue.current.push(inputData as any);
      setStatus(prev => ({ ...prev, queuedMessages: messageQueue.current.length }));
      return false;
    }

    const jsonData = JSON.stringify(inputData);
    console.log('📤 发送数据到Unity:', jsonData);

    try {
      // 同源时可直接调用（保留向后兼容）
      if (window.unityInstance && typeof window.unityInstance.SendMessage === 'function') {
        window.unityInstance.SendMessage('ConvaiGRPCWebAPI', 'InjectWebInput', jsonData);
      } else {
        // 跨源：通过 postMessage 通知子页，由子页调用 SendMessage
        const iframe = document.getElementById('unity-iframe') as HTMLIFrameElement | null;
        iframe?.contentWindow?.postMessage({ type: 'UNITY_INPUT', payload: jsonData }, '*');
      }
      emit('message-sent', inputData);
      return true;
    } catch (error) {
      console.error('❌ 发送数据到Unity失败:', error);
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
    const inputData: WebInputData = {
      type: 'voice_start',
      source: 'web'
    };
    
    setStatus(prev => ({ ...prev, isVoiceRecording: true }));
    return sendToUnity(inputData);
  }, [sendToUnity]);

  // 停止语音输入
  const stopVoice = useCallback((): boolean => {
    const inputData: WebInputData = {
      type: 'voice_stop',
      source: 'web'
    };
    
    setStatus(prev => ({ ...prev, isVoiceRecording: false }));
    return sendToUnity(inputData);
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
    
    let timeoutId: NodeJS.Timeout;
    
    // 监听Unity准备就绪消息
    const handleUnityReady = (event: MessageEvent) => {
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
        window.removeEventListener('message', handleUnityReady);
      }
    };
    
    // 添加消息监听器
    window.addEventListener('message', handleUnityReady);
    
    // 设置超时备用方案
    timeoutId = setTimeout(() => {
      window.removeEventListener('message', handleUnityReady);
      
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
          updateConnectionStatus('disconnected');
          emit('unity-error', error);
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
    initUnityBridge();

    // 清理函数
    return () => {
      if (window.receiveUnityOutput) {
        delete window.receiveUnityOutput;
      }
      eventListeners.current.clear();
      messageQueue.current = [];
    };
  }, [initUnityBridge]);

  // 当Unity加载状态改变时处理队列
  useEffect(() => {
    if (status.isUnityLoaded) {
      processMessageQueue();
    }
  }, [status.isUnityLoaded, processMessageQueue]);

  // 测试通信功能
  const testConnection = useCallback(() => {
    console.log('📞 测试Unity通信...');
    
    const testData: WebInputData = {
      type: 'text',
      content: 'Test message from React',
      source: 'web'
    };
    
    const success = sendToUnity(testData);
    console.log(success ? '✅ 测试消息发送成功' : '❌ 测试消息发送失败');
    return success;
  }, [sendToUnity]);

  return {
    status,
    sendText,
    startVoice,
    stopVoice,
    sendToUnity,
    reconnect,
    testConnection,
    on,
    off,
    emit
  };
};
