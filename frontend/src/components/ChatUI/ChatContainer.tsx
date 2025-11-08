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
  const { status, sendText } = unityBridge;

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
    
    // 自动滚动到最新消息（多种方法确保可靠性）
    setTimeout(() => {
      // 方法1：使用消息容器滚动
      const messagesContainer = document.querySelector('.messages-container');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
      
      // 方法2：使用消息列表滚动
      const messagesList = document.querySelector('.messages-list');
      if (messagesList) {
        messagesList.scrollTop = messagesList.scrollHeight;
      }
      
      // 方法3：使用ref滚动到底部
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'end' 
        });
      }
    }, 50);
  }, []);

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
    console.log('🎤 [ChatContainer] handleStartVoice 被调用');
    console.log('🎤 [ChatContainer] Unity连接状态:', unityBridge.status.connectionStatus);
    console.log('🎤 [ChatContainer] Unity加载状态:', unityBridge.status.isUnityLoaded);
    
    // 调用Unity桥接的语音开始函数
    const success = unityBridge.startVoice();
    console.log('🎤 [ChatContainer] unityBridge.startVoice() 返回:', success);
    
    if (success) {
      console.log('✅ [ChatContainer] 语音启动成功，添加系统消息');
      addMessage({
        type: 'system',
        content: '🎤 请点击Unity画面并按住T键进行语音输入',
        timestamp: new Date(),
        status: 'sent'
      });
    } else {
      console.log('❌ [ChatContainer] 语音启动失败，添加错误消息');
      addMessage({
        type: 'system',
        content: '❌ Unity语音输入启动失败',
        timestamp: new Date(),
        status: 'error'
      });
    }
  }, [unityBridge, addMessage]);

  const handleStopVoice = useCallback(() => {
    console.log('🛑 [ChatContainer] handleStopVoice 被调用');
    
    // 调用Unity桥接的语音停止函数
    const success = unityBridge.stopVoice();
    console.log('🛑 [ChatContainer] unityBridge.stopVoice() 返回:', success);
    
    if (success) {
      console.log('✅ [ChatContainer] 语音停止成功，添加系统消息');
      addMessage({
        type: 'system',
        content: '🛑 请释放T键停止语音输入',
        timestamp: new Date(),
        status: 'sent'
      });
    } else {
      console.log('❌ [ChatContainer] 语音停止失败，添加错误消息');
      addMessage({
        type: 'system',
        content: '❌ Unity语音输入停止失败',
        timestamp: new Date(),
        status: 'error'
      });
    }
  }, [unityBridge, addMessage]);

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

  // 监听Unity输出
  useEffect(() => {
    const handleUnityOutput = (data: any) => {
      if (!data || typeof data !== 'object') return;
      
      // 统一抽取 NPC 文本与名称（兼容不同字段）
      const pickNpcName = (d: any) => d?.npcName || d?.npc || d?.characterName || d?.name || 'NPC';
      const pickNpcText = (d: any) => {
        // 优先检查各种可能的文本字段
        const possibleTexts = [
          d?.content, d?.text, d?.message, d?.transcript, 
          d?.speech?.text, d?.response, d?.reply, d?.answer
        ];
        
        for (const text of possibleTexts) {
          if (text && typeof text === 'string' && text.trim()) {
            return text.trim();
          }
        }
        
        // 如果没有找到文本字段，但数据本身是字符串，直接返回
        if (typeof d === 'string' && d.trim()) {
          return d.trim();
        }
        
        return '';
      };

      const maybeNpcText = pickNpcText(data);
      const maybeNpcName = pickNpcName(data);
      const normalizedType = data?.type || (maybeNpcText ? 'npc_text' : undefined);

      // 根据消息类型分发到对应的处理函数
      switch (normalizedType) {
        case 'npc_text': {
          const npcText = maybeNpcText || '未知回复';
          const npcName = maybeNpcName;

          // 去重策略：检查近三条是否重复
          setMessages(prev => {
            const recent = prev.slice(-3);
            const duplicated = recent.some(m => m.type === 'npc' && m.content === npcText && (m.npcName || 'NPC') === npcName);
            if (duplicated) {
              return prev;
            }

            const newMessage = {
              id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              type: 'npc' as const,
              content: npcText,
              timestamp: new Date(),
              npcName,
              status: 'sent' as const
            };
            
            const newMessages = [...prev, newMessage];
            
            // 自动滚动到最新消息
            setTimeout(() => {
              // 方法1：使用消息容器滚动
              const messagesContainer = document.querySelector('.messages-container');
              if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
              }
              
              // 方法2：使用消息列表滚动（备用）
              const messagesList = document.querySelector('.messages-list');
              if (messagesList) {
                messagesList.scrollTop = messagesList.scrollHeight;
              }
              
              // 方法3：使用ref滚动到底部元素
              if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'end' 
                });
              }
            }, 50); // 减少延迟，更快响应
            
            return newMessages;
          });
          break;
        }
          
        case 'user_text':
          // 不处理Unity回传的用户输入
          break;
          
        case 'talking_status':
          const isTalking = data.isTalking || false;
          setIsNPCTalking(isTalking);
          break;

        case 'voice_transcript': {
          // 语音转文字结果，作为用户消息显示
          const transcriptText = maybeNpcText;
          if (!transcriptText) break;

          const userMessage = {
            id: `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'user' as const,
            content: `🎤 ${transcriptText}`,
            timestamp: new Date(),
            npcName: '你 (语音)',
            status: 'sent' as const
          };

          setMessages(prev => {
            const newMessages = [...prev, userMessage];
            
            // 自动滚动到最新消息
            setTimeout(() => {
              const messagesContainer = document.querySelector('.messages-container');
              if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
              }
              if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'end' 
                });
              }
            }, 50);
            
            return newMessages;
          });

          // 将语音转文字结果作为文本发送给Unity
          setTimeout(() => {
            unityBridge.sendText(transcriptText);
          }, 200);
          break;
        }

        case 'voice_recording': {
          // 语音录制状态更新
          if (data.recording === true) {
            console.log('🎤 语音录制开始');
            // 显示Unity语音录制状态
            addMessage({
              type: 'system',
              content: maybeNpcText || '🎤 Unity语音系统已激活',
              timestamp: new Date(),
              status: 'sent'
            });
          } else if (data.recording === false) {
            console.log('🛑 语音录制结束');
            addMessage({
              type: 'system',
              content: maybeNpcText || '🛑 Unity语音录制已停止',
              timestamp: new Date(),
              status: 'sent'
            });
          }
          break;
        }
          
        default:
          // 容错：如果没提供类型，但看起来像 NPC 文本，也按 npc_text 处理
          if (maybeNpcText) {
            const npcText = maybeNpcText;
            const npcName = maybeNpcName;
            setMessages(prev => {
              const newMessages = [...prev, {
                id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'npc' as const,
                content: npcText,
                timestamp: new Date(),
                npcName,
                status: 'sent' as const
              }];
              
              // 自动滚动到最新消息
              setTimeout(() => {
                const messagesContainer = document.querySelector('.messages-container');
                if (messagesContainer) {
                  messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }
                
                const messagesList = document.querySelector('.messages-list');
                if (messagesList) {
                  messagesList.scrollTop = messagesList.scrollHeight;
                }
                
                if (messagesEndRef.current) {
                  messagesEndRef.current.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'end' 
                  });
                }
              }, 50);
              
              return newMessages;
            });
          }
      }
    };

    // 注册 unity-output 事件监听器
    unityBridge.on('unity-output', handleUnityOutput);
    unityBridge.on('unity-npc_text', handleUnityOutput as any);

    // 清理函数
    return () => {
      unityBridge.off('unity-output', handleUnityOutput);
      unityBridge.off('unity-npc_text', handleUnityOutput as any);
    };
  }, [unityBridge]); // 当 unityBridge 实例变更时重新注册监听器，防止热更新导致失联

  // 初始化欢迎消息
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        type: 'system',
        content: '欢迎使用 Convai 智能对话系统！你可以通过文字或语音与AI角色进行对话。',
        timestamp: new Date(),
        status: 'sent'
      }]);
      
      // 确保欢迎消息也能被看到
      setTimeout(() => {
        const messagesContainer = document.querySelector('.messages-container');
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }, [messages.length]);


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
