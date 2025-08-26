import React from 'react';
import { ChatMessage as ChatMessageType } from '../../types/unity.ts';

interface ChatMessageProps {
  message: ChatMessageType;
  isLatest?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isLatest }) => {
  const getMessageIcon = () => {
    switch (message.type) {
      case 'user':
        return '👤';
      case 'npc':
        return '🤖';
      case 'system':
        return 'ℹ️';
      default:
        return '';
    }
  };

  const getMessageClass = () => {
    const baseClass = 'message';
    switch (message.type) {
      case 'user':
        return `${baseClass} user-message`;
      case 'npc':
        return `${baseClass} npc-message`;
      case 'system':
        return `${baseClass} system-message`;
      default:
        return baseClass;
    }
  };

  return (
    <div className={getMessageClass()}>
      <div className="message-header">
        <div className="message-avatar">
          {getMessageIcon()}
        </div>
        <div className="message-meta">
          <span className="message-sender">
            {message.type === 'user' ? '你' : 
             message.type === 'npc' ? (message.npcName || 'AI助手') : 
             '系统'}
          </span>
          <span className="message-time">
            {message.timestamp.toLocaleTimeString()}
          </span>
        </div>
        {message.status && (
          <div className={`message-status ${message.status}`}>
            {message.status === 'sending' && '发送中...'}
            {message.status === 'sent' && '✓'}
            {message.status === 'error' && '✗'}
          </div>
        )}
      </div>
      
      <div className="message-content">
        <div className="message-text">
          {message.content}
        </div>
      </div>

      {/* 最新消息指示器 */}
      {isLatest && message.type === 'npc' && (
        <div className="latest-indicator">
          新消息
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
