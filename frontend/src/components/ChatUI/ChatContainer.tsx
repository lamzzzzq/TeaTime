import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatMessage from './ChatMessage.tsx';
import ChatInput from './ChatInput.tsx';
import NPCInfo from './NPCInfo.tsx';
import { ChatMessage as ChatMessageType, NPCInfo as NPCInfoType } from '../../types/unity.ts';

interface ChatContainerProps {
  unityBridge: ReturnType<typeof import('../../hooks/useUnityBridge').useUnityBridge>;
}

const ChatContainer: React.FC<ChatContainerProps> = ({ unityBridge }) => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [currentNPC, setCurrentNPC] = useState<NPCInfoType | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isNPCTalking, setIsNPCTalking] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { status, sendText, on, off } = unityBridge;

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

  // 修复状态更新逻辑
  const updateMessageStatus = useCallback((messageId: string, newStatus: 'sent' | 'pending' | 'error') => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, status: newStatus }
        : msg
    ));
  }, []);

  // 处理发送文本消息
  const handleSendText = useCallback((text: string) => {
    if (!text.trim()) return;
    
    const message: ChatMessageType = {
      id: Date.now().toString(),
      type: 'user',
      content: text.trim(),
      timestamp: new Date(),
      npcName: '你',
      status: 'pending' // 初始状态为pending
    };
    
    addMessage(message);
    
    // 发送到Unity
    const success = unityBridge.sendText(text.trim());
    
    // 根据发送结果更新状态
    if (success) {
      updateMessageStatus(message.id, 'sent');
    } else {
      updateMessageStatus(message.id, 'error');
    }
  }, [unityBridge, addMessage, updateMessageStatus]);

  // 处理语音录制
  const handleStartVoice = useCallback(() => {
    console.log('🎤 开始语音录制');
    // 临时禁用语音功能，避免错误
    console.log('语音功能暂时禁用');
    
    addMessage({
      type: 'system',
      content: '语音功能暂时禁用，请使用文字输入',
      timestamp: new Date(),
      status: 'info'
    });
  }, [addMessage]);

  const handleStopVoice = useCallback(() => {
    console.log('🛑 停止语音录制');
    // 临时禁用语音功能，避免错误
    console.log('语音功能暂时禁用');
    
    addMessage({
      type: 'system',
      content: '语音功能暂时禁用',
      timestamp: new Date(),
      status: 'info'
    });
  }, [addMessage]);

  // 清空聊天记录
  const handleClearChat = useCallback(() => {
    if (window.confirm('确定要清空所有聊天记录吗？')) {
      setMessages([{
        id: 'welcome',
        type: 'system',
        content: '欢迎使用 Convai 智能对话系统！你可以通过文字或语音与AI角色进行对话。',
        timestamp: new Date(),
        status: 'sent'
      }]);
    }
  }, []);

  // 监听Unity输出（按照API指南格式）
  useEffect(() => {
    // 只保留 unity-output 事件监听
    const handleUnityOutput = (data: any) => {
      console.log('📨 收到Unity输出事件:', data);
      
      // 根据消息类型分发到对应的处理函数
      switch (data.type) {
        case 'npc_text':
          console.log('🤖 Unity NPC回复:', data);
          addMessage({
            type: 'npc',
            content: data.content || '未知回复',
            timestamp: new Date(),
            npcName: 'NPC',
            status: 'sent'
          });
          break;
          
        case 'user_text':
          // ❌ 删除这个分支 - 不处理Unity回传的用户输入
          console.log('👤 Unity确认用户输入（跳过显示）:', data);
          break;
          
        case 'talking_status':
          console.log('🗣️ Unity说话状态:', data);
          // 处理说话状态变化
          break;
          
        default:
          console.log('📝 未知Unity输出类型:', data.type);
      }
    };

    // 只添加 unity-output 事件监听器
    unityBridge.on('unity-output', handleUnityOutput);

    // 清理函数
    return () => {
      unityBridge.off('unity-output', handleUnityOutput);
    };
  }, [unityBridge, addMessage]);

  // 初始化欢迎消息
  useEffect(() => {
    if (messages.length === 0) {
      addMessage({
        type: 'system',
        content: '欢迎使用 Convai 智能对话系统！你可以通过文字或语音与AI角色进行对话。',
        timestamp: new Date(),
        status: 'sent'
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
