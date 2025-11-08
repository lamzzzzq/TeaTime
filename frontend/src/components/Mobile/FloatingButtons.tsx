import React, { useState, useRef } from 'react';
import '../../styles/Mobile.css';

interface FloatingButtonsProps {
  onVoicePress: (isRecording: boolean) => void;
  onChatOpen: () => void;
  isChatOpen: boolean;
}

export const FloatingButtons: React.FC<FloatingButtonsProps> = ({
  onVoicePress,
  onChatOpen,
  isChatOpen
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // ============================================
  // 语音按钮：长按开始录音
  // ============================================
  const handleVoiceTouchStart = () => {
    console.log('🎤 语音按钮：触摸开始');
    
    // 500ms后触发长按
    longPressTimer.current = setTimeout(() => {
      console.log('🔴 开始录音');
      setIsRecording(true);
      onVoicePress(true);
      
      // 触觉反馈（如果设备支持）
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500);
  };

  const handleVoiceTouchEnd = () => {
    console.log('🎤 语音按钮：触摸结束');
    
    // 清除定时器
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    // 如果正在录音，停止录音
    if (isRecording) {
      console.log('⏹️ 停止录音');
      setIsRecording(false);
      onVoicePress(false);
      
      // 触觉反馈
      if (navigator.vibrate) {
        navigator.vibrate(30);
      }
    }
  };

  // 防止误触：手指移出按钮时取消录音
  const handleVoiceTouchCancel = () => {
    console.log('🚫 语音按钮：触摸取消');
    
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (isRecording) {
      setIsRecording(false);
      onVoicePress(false);
    }
  };

  // ============================================
  // 文字按钮：点击展开遮罩
  // ============================================
  const handleChatClick = () => {
    console.log('💬 文字按钮：点击展开遮罩');
    onChatOpen();
    
    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  };

  // 如果遮罩已打开，隐藏浮动按钮
  if (isChatOpen) {
    return null;
  }

  return (
    <div className="floating-buttons-container">
      {/* 语音输入按钮 */}
      <button
        className={`floating-btn voice-btn ${isRecording ? 'recording' : ''}`}
        onTouchStart={handleVoiceTouchStart}
        onTouchEnd={handleVoiceTouchEnd}
        onTouchCancel={handleVoiceTouchCancel}
        onMouseDown={handleVoiceTouchStart}
        onMouseUp={handleVoiceTouchEnd}
        onMouseLeave={handleVoiceTouchCancel}
        aria-label="语音输入"
      >
        {isRecording ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* 停止图标 */}
            <rect x="6" y="6" width="12" height="12" fill="white" rx="2"/>
          </svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* 麦克风图标 */}
            <path d="M12 14C13.66 14 15 12.66 15 11V5C15 3.34 13.66 2 12 2C10.34 2 9 3.34 9 5V11C9 12.66 10.34 14 12 14Z" fill="white"/>
            <path d="M17 11C17 13.76 14.76 16 12 16C9.24 16 7 13.76 7 11H5C5 14.53 7.61 17.43 11 17.92V21H13V17.92C16.39 17.43 19 14.53 19 11H17Z" fill="white"/>
          </svg>
        )}
        
        {/* 录音时的脉冲动画 */}
        {isRecording && <div className="pulse-ring"></div>}
      </button>

      {/* 文字输入按钮 */}
      <button
        className="floating-btn chat-btn"
        onClick={handleChatClick}
        aria-label="文字聊天"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* 对话框图标 */}
          <path d="M20 2H4C2.9 2 2.01 2.9 2.01 4L2 22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM18 14H6V12H18V14ZM18 11H6V9H18V11ZM18 8H6V6H18V8Z" fill="white"/>
        </svg>
        
        {/* 未读消息徽章（可选，后续添加） */}
        {/* <span className="badge">3</span> */}
      </button>
    </div>
  );
};

export default FloatingButtons;

