import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatMessage from '../ChatUI/ChatMessage.tsx';
import { ChatMessage as ChatMessageType } from '../../types/unity.ts';
import '../../styles/Mobile.css';

interface ChatOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  unityBridge: ReturnType<typeof import('../../hooks/useUnityBridge').useUnityBridge>;
}

export const ChatOverlay: React.FC<ChatOverlayProps> = ({
  isOpen,
  onClose,
  unityBridge
}) => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputText, setInputText] = useState('');
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
  }, []);

  // 添加消息
  const addMessage = useCallback((message: Omit<ChatMessageType, 'id'>) => {
    const newMessage: ChatMessageType = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    setMessages(prev => [...prev, newMessage]);
    scrollToBottom();
  }, [scrollToBottom]);

  // 处理发送文本消息
  const handleSendText = useCallback(() => {
    if (!inputText.trim()) return;
    
    const message: ChatMessageType = {
      id: Date.now().toString(),
      type: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
      npcName: '你',
      status: 'pending'
    };
    
    addMessage(message);
    
    // 发送到Unity
    const success = unityBridge.sendText(inputText.trim());
    
    // 清空输入框
    setInputText('');
    
    // 更新消息状态
    setMessages(prev => prev.map(msg => 
      msg.id === message.id 
        ? { ...msg, status: success ? 'sent' : 'error' }
        : msg
    ));
  }, [inputText, unityBridge, addMessage]);

  // 处理按键事件
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  }, [handleSendText]);

  // 处理语音按钮
  const handleVoiceToggle = useCallback(() => {
    if (isVoiceRecording) {
      console.log('⏹️ 停止录音');
      unityBridge.stopVoice();
      setIsVoiceRecording(false);
    } else {
      console.log('🎤 开始录音');
      const success = unityBridge.startVoice();
      if (success) {
        setIsVoiceRecording(true);
        addMessage({
          type: 'system',
          content: '🎤 语音录制中...',
          timestamp: new Date(),
          status: 'sent'
        });
      }
    }
  }, [isVoiceRecording, unityBridge, addMessage]);

  // 监听Unity消息
  useEffect(() => {
    const handleUnityOutput = (data: any) => {
      if (!data || typeof data !== 'object') return;
      
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
        return '';
      };

      const maybeNpcText = pickNpcText(data);
      const maybeNpcName = pickNpcName(data);
      const normalizedType = data?.type || (maybeNpcText ? 'npc_text' : undefined);

      switch (normalizedType) {
        case 'npc_text': {
          if (!maybeNpcText) break;
          
          // 去重检查
          setMessages(prev => {
            const recent = prev.slice(-3);
            const duplicated = recent.some(m => 
              m.type === 'npc' && 
              m.content === maybeNpcText && 
              (m.npcName || 'NPC') === maybeNpcName
            );
            
            if (duplicated) return prev;

            const newMessage: ChatMessageType = {
              id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              type: 'npc',
              content: maybeNpcText,
              timestamp: new Date(),
              npcName: maybeNpcName,
              status: 'sent'
            };
            
            return [...prev, newMessage];
          });
          
          scrollToBottom();
          break;
        }

        case 'voice_transcript': {
          if (!maybeNpcText) break;
          
          addMessage({
            type: 'user',
            content: `🎤 ${maybeNpcText}`,
            timestamp: new Date(),
            npcName: '你 (语音)',
            status: 'sent'
          });
          
          // 发送到Unity
          setTimeout(() => {
            unityBridge.sendText(maybeNpcText);
          }, 200);
          break;
        }
      }
    };

    unityBridge.on('unity-output', handleUnityOutput);
    unityBridge.on('unity-npc_text', handleUnityOutput as any);

    return () => {
      unityBridge.off('unity-output', handleUnityOutput);
      unityBridge.off('unity-npc_text', handleUnityOutput as any);
    };
  }, [unityBridge, addMessage, scrollToBottom]);

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
    }
  }, []);

  // 监听键盘弹出
  useEffect(() => {
    const handleKeyboard = () => {
      if (window.visualViewport) {
        const currentKeyboardHeight = window.innerHeight - window.visualViewport.height;
        setKeyboardHeight(currentKeyboardHeight);
        console.log('⌨️ 键盘高度:', currentKeyboardHeight);
      }
    };

    window.visualViewport?.addEventListener('resize', handleKeyboard);
    window.addEventListener('resize', handleKeyboard);
    
    return () => {
      window.visualViewport?.removeEventListener('resize', handleKeyboard);
      window.removeEventListener('resize', handleKeyboard);
    };
  }, []);

  // 遮罩打开时自动滚动到底部
  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, scrollToBottom]);

  if (!isOpen) return null;

  return (
    <>
      {/* 背景遮罩 */}
      <div 
        className="chat-overlay-backdrop"
        onClick={onClose}
      />
      
      {/* 对话遮罩 */}
      <div 
        className="chat-overlay"
        style={{ 
          bottom: keyboardHeight > 0 ? `${keyboardHeight}px` : '0'
        }}
      >
        {/* 头部 */}
        <div className="chat-overlay-header">
          <button 
            className="back-btn"
            onClick={onClose}
            aria-label="返回"
          >
            ←
          </button>
          <h3>对话记录</h3>
          <button 
            className="close-btn"
            onClick={onClose}
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        {/* 消息区域 */}
        <div className="chat-overlay-messages">
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
        <div className="chat-overlay-input">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入消息..."
            className="message-input"
          />
          
          <button
            className={`voice-btn-overlay ${isVoiceRecording ? 'recording' : ''}`}
            onClick={handleVoiceToggle}
            aria-label="语音输入"
          >
            🎤
          </button>
          
          <button
            className="send-btn-overlay"
            onClick={handleSendText}
            disabled={!inputText.trim()}
            aria-label="发送"
          >
            📤
          </button>
        </div>
      </div>
    </>
  );
};

export default ChatOverlay;

