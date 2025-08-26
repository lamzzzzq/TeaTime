import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatMessage from './ChatMessage.tsx';
import ChatInput from './ChatInput.tsx';
import NPCInfo from './NPCInfo.tsx';
import { ChatMessage as ChatMessageType, NPCInfo as NPCInfoType } from '../../types/unity.ts';
import { useUnityBridge } from '../../hooks/useUnityBridge.ts';

const ChatContainer: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [currentNPC, setCurrentNPC] = useState<NPCInfoType | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isNPCTalking, setIsNPCTalking] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { status, sendText, startVoice, stopVoice, testConnection, on, off } = useUnityBridge();

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // 添加消息
  const addMessage = useCallback((message: Omit<ChatMessageType, 'id'>) => {
    const newMessage: ChatMessageType = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // 延迟滚动，确保DOM更新完成
    setTimeout(scrollToBottom, 100);
  }, [scrollToBottom]);

  // 处理发送文本消息
  const handleSendText = useCallback((text: string) => {
    // 添加用户消息
    addMessage({
      type: 'user',
      content: text,
      timestamp: new Date(),
      status: 'sending'
    });

    // 发送到Unity
    const success = sendText(text);

    if (!success) {
      // 未连接时sendText会排队，这里标记为pending而不是error
      setMessages(prev => 
        prev.map(msg => 
          msg.timestamp.getTime() > Date.now() - 1000 && msg.type === 'user'
            ? { ...msg, status: status.isUnityLoaded ? 'error' : 'pending' }
            : msg
        )
      );
      if (status.isUnityLoaded) {
        addMessage({
          type: 'system',
          content: '消息发送失败，请稍后重试',
          timestamp: new Date()
        });
      } else {
        addMessage({
          type: 'system',
          content: 'Unity未连接，消息已排队，连接后自动发送。',
          timestamp: new Date()
        });
      }
    } else {
      // 发送成功，更新消息状态
      setMessages(prev => 
        prev.map(msg => 
          msg.timestamp.getTime() > Date.now() - 1000 && msg.type === 'user'
            ? { ...msg, status: 'sent' }
            : msg
        )
      );
    }
  }, [sendText, addMessage]);

  // 处理语音录制
  const handleStartVoice = useCallback(() => {
    console.log('🎤 开始语音录制');
    const success = startVoice();
    if (success) {
      console.log('✅ 语音输入开始成功');
    } else {
      console.error('❌ 语音输入开始失败');
      addMessage({
        type: 'system',
        content: '语音录制开始失败，请检查Unity连接状态',
        timestamp: new Date()
      });
    }
  }, [startVoice, addMessage]);

  const handleStopVoice = useCallback(() => {
    console.log('🛑 停止语音录制');
    const success = stopVoice();
    if (success) {
      console.log('✅ 语音输入停止成功');
    } else {
      console.error('❌ 语音输入停止失败');
      addMessage({
        type: 'system',
        content: '语音录制停止失败',
        timestamp: new Date()
      });
    }
  }, [stopVoice, addMessage]);

  // 清空聊天记录
  const handleClearChat = useCallback(() => {
    if (window.confirm('确定要清空所有聊天记录吗？')) {
      setMessages([{
        id: 'welcome',
        type: 'system',
        content: '欢迎使用 Convai 智能对话系统！你可以通过文字或语音与AI角色进行对话。',
        timestamp: new Date()
      }]);
    }
  }, []);

  // 监听Unity输出（按照API指南格式）
  useEffect(() => {
    // 监听用户文本输入（包括语音转录）
    const handleUserText = (data: any) => {
      console.log('👤 Unity用户输入（包括语音转录）:', data);
      
      // 添加用户消息到聊天记录
      addMessage({
        type: 'user',
        content: data.content || '未知输入',
        timestamp: new Date(),
        status: 'sent'
      });
    };

    // 监听NPC回复
    const handleNPCText = (data: any) => {
      console.log('🤖 Unity NPC回复:', data);
      
      addMessage({
        type: 'npc',
        content: data.content || '未知回复',
        timestamp: new Date(),
        npcName: data.npcName || '未知NPC',
        status: 'sent'
      });
    };

    // 监听NPC说话状态
    const handleTalkingStatus = (data: any) => {
      console.log('🗣️ Unity说话状态:', data);
      
      const isTalking = data.additionalData?.isTalking || false;
      setIsNPCTalking(isTalking);
      
      // 更新当前NPC信息
      if (data.npcName) {
        setCurrentNPC(prev => ({
          name: data.npcName,
          id: prev?.id || 'unknown',
          status: isTalking ? 'talking' : 'listening',
          isTalking
        }));
      }
    };

    // 监听Unity连接成功
    const handleUnityConnected = (unityInstance: any) => {
      console.log('🎉 Unity连接成功:', unityInstance);
      
      addMessage({
        type: 'system',
        content: 'Unity连接成功！现在可以开始对话了。',
        timestamp: new Date()
      });
      
      // 可以在这里执行连接后的初始化操作
      // 比如测试通信
      setTimeout(() => {
        testConnection();
      }, 1000);
    };

    // 监听Unity错误
    const handleUnityError = (error: any) => {
      console.error('❌ Unity错误:', error);
      
      addMessage({
        type: 'system',
        content: `Unity连接失败: ${error.message || '未知错误'}`,
        timestamp: new Date()
      });
    };

    // 监听连接状态变化
    const handleConnectionChange = (connectionStatus: string) => {
      console.log('🔗 Unity连接状态变化:', connectionStatus);
      
      if (connectionStatus === 'disconnected') {
        addMessage({
          type: 'system',
          content: 'Unity连接已断开',
          timestamp: new Date()
        });
      }
    };

    // 注册事件监听器
    on('unity-user_text', handleUserText);
    on('unity-npc_text', handleNPCText);
    on('unity-talking_status', handleTalkingStatus);
    on('unity-connected', handleUnityConnected);
    on('unity-error', handleUnityError);
    on('connection-status-change', handleConnectionChange);

    // 清理函数
    return () => {
      off('unity-user_text', handleUserText);
      off('unity-npc_text', handleNPCText);
      off('unity-talking_status', handleTalkingStatus);
      off('unity-connected', handleUnityConnected);
      off('unity-error', handleUnityError);
      off('connection-status-change', handleConnectionChange);
    };
  }, [on, off, addMessage, testConnection]);

  // 初始化欢迎消息
  useEffect(() => {
    if (messages.length === 0) {
      addMessage({
        type: 'system',
        content: '欢迎使用 Convai 智能对话系统！你可以通过文字或语音与AI角色进行对话。',
        timestamp: new Date()
      });
    }
  }, [messages.length, addMessage]);

  return (
    <section className={`chat-section ${isMinimized ? 'minimized' : ''}`}>
      <div className="chat-container">
        {/* 聊天头部 */}
        <div className="chat-header">
          <div className="chat-title">
            <span className="chat-icon">💬</span>
            <span>对话记录</span>
            <div className="message-count">
              {messages.filter(m => m.type !== 'system').length}
            </div>
          </div>
          
          <div className="chat-controls">
            <button
              className="control-btn"
              onClick={() => testConnection()}
              title="测试Unity通信"
              disabled={!status.isUnityLoaded}
            >
              📞
            </button>
            
            <button
              className="control-btn"
              onClick={handleClearChat}
              title="清空对话"
            >
              🗑️
            </button>
            
            <button
              className="control-btn"
              onClick={() => setIsMinimized(!isMinimized)}
              title={isMinimized ? "展开" : "最小化"}
            >
              {isMinimized ? '📋' : '📋'}
            </button>
          </div>
        </div>

        {!isMinimized && (
          <div className="chat-content">
            {/* 当前NPC信息 */}
            {currentNPC && (
              <NPCInfo 
                npc={currentNPC}
                isTalking={isNPCTalking}
              />
            )}

            {/* 消息显示区域 */}
            <div className="messages-container">
              <div className="messages-list">
                {messages.map((message, index) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isLatest={index === messages.length - 1}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* 输入区域 */}
            <ChatInput
              onSendText={handleSendText}
              onStartVoice={handleStartVoice}
              onStopVoice={handleStopVoice}
              isVoiceRecording={status.isVoiceRecording}
              isUnityConnected={status.isUnityLoaded}
              disabled={isNPCTalking}
            />
          </div>
        )}
      </div>
    </section>
  );
};

export default ChatContainer;
