import React from 'react';
import { UnityBridgeStatus } from '../types/unity.ts';

interface HeaderProps {
  unityStatus: UnityBridgeStatus;
}

const Header: React.FC<HeaderProps> = ({ unityStatus }) => {
  const getStatusText = () => {
    switch (unityStatus.connectionStatus) {
      case 'connected':
        return 'Unity已连接';
      case 'connecting':
        return '连接中...';
      case 'disconnected':
        return 'Unity未连接';
      default:
        return '未知状态';
    }
  };

  const getStatusClass = () => {
    switch (unityStatus.connectionStatus) {
      case 'connected':
        return 'connected';
      case 'connecting':
        return 'connecting';
      case 'disconnected':
        return 'disconnected';
      default:
        return 'disconnected';
    }
  };

  return (
    <header className="app-header">
      <div className="header-content">
        <h1 className="app-title">
          <span className="logo-icon">🤖</span>
          Convai 智能对话
        </h1>
        
        <div className="header-status">
          <div className="connection-status">
            <span className={`status-dot ${getStatusClass()}`}></span>
            <div className="status-info">
              <div className="status-text">
                <span>{getStatusText()}</span>
              </div>
              {unityStatus.queuedMessages > 0 && (
                <div className="queue-info">
                  队列: {unityStatus.queuedMessages} 条消息
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
