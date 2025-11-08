import React, { useState, useRef, useCallback, useEffect } from 'react';

interface ChatInputProps {
  onSendText: (text: string) => void;
  onStartVoice: () => void;
  onStopVoice: () => void;
  isVoiceRecording: boolean;
  isUnityConnected: boolean;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendText,
  onStartVoice,
  onStopVoice,
  isVoiceRecording,
  isUnityConnected,
  disabled = false
}) => {
  const [inputText, setInputText] = useState('');
  const [charCount, setCharCount] = useState(0);
  const [isVoicePressed, setIsVoicePressed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const maxLength = 500;

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputText(value);
    setCharCount(value.length);
  }, []);

  const handleSendText = useCallback(() => {
    const text = inputText.trim();
    // 放宽限制：未连接也允许输入与尝试发送（上层会排队）
    if (text && !disabled) {
      onSendText(text);
      setInputText('');
      setCharCount(0);
      inputRef.current?.focus();
    }
  }, [inputText, disabled, onSendText]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  }, [handleSendText]);

  const handleVoiceStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🎤 [ChatInput] 语音按钮按下 - 事件类型:', e.type);
    console.log('🎤 [ChatInput] 当前isVoicePressed状态:', isVoicePressed);
    
    if (!disabled && !isVoicePressed) {
      console.log('🎤 [ChatInput] 设置isVoicePressed=true，调用 onStartVoice()');
      setIsVoicePressed(true);
      onStartVoice();
    } else if (isVoicePressed) {
      console.log('⚠️ [ChatInput] 语音已经在录制中，忽略重复按下');
    } else {
      console.log('⚠️ [ChatInput] 语音按钮被禁用，无法启动');
    }
  }, [disabled, onStartVoice, isVoicePressed]);

  const handleVoiceStop = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🛑 [ChatInput] 语音按钮释放 - 事件类型:', e.type);
    console.log('🛑 [ChatInput] 当前isVoicePressed状态:', isVoicePressed);
    
    if (isVoicePressed) {
      console.log('🛑 [ChatInput] 设置isVoicePressed=false，调用 onStopVoice()');
      setIsVoicePressed(false);
      onStopVoice();
    } else {
      console.log('⚠️ [ChatInput] 语音没有在录制，忽略释放事件');
    }
  }, [onStopVoice, isVoicePressed]);

  // 处理鼠标离开按钮区域的情况 - 暂时禁用，避免意外停止
  const handleVoiceLeave = useCallback((e: React.MouseEvent) => {
    console.log('🚪 [ChatInput] 鼠标离开语音按钮 - 事件类型:', e.type);
    console.log('🚪 [ChatInput] 当前isVoicePressed状态:', isVoicePressed);
    console.log('🚪 [ChatInput] 暂时忽略mouseleave事件，避免意外停止');
    
    // 暂时不在鼠标离开时停止，只有真正的mouseup才停止
    // 这样可以防止用户在按住按钮时意外移动鼠标导致停止
  }, [isVoicePressed]);

  // 添加全局鼠标释放监听器，确保在任何地方释放鼠标都能停止录音
  useEffect(() => {
    if (!isVoicePressed) return;

    const handleGlobalMouseUp = (e: MouseEvent) => {
      console.log('🌍 [ChatInput] 全局鼠标释放事件');
      if (isVoicePressed) {
        console.log('🌍 [ChatInput] 全局鼠标释放，停止语音录制');
        setIsVoicePressed(false);
        onStopVoice();
      }
    };

    const handleGlobalTouchEnd = (e: TouchEvent) => {
      console.log('🌍 [ChatInput] 全局触摸结束事件');
      if (isVoicePressed) {
        console.log('🌍 [ChatInput] 全局触摸结束，停止语音录制');
        setIsVoicePressed(false);
        onStopVoice();
      }
    };

    // 添加全局事件监听器
    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('touchend', handleGlobalTouchEnd);

    // 清理事件监听器
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [isVoicePressed, onStopVoice]);

  const canSend = inputText.trim().length > 0 && !disabled;

  return (
    <div className="input-container">
      {/* 输入框和按钮 */}
      <div className="input-row">
        <div className="text-input-container">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={disabled ? "输入已禁用..." : "输入你想说的话..."}
            maxLength={maxLength}
            disabled={disabled}
            className="text-input"
          />
          
          <div className="input-counter">
            <span className={charCount > maxLength * 0.8 ? 'warning' : ''}>
              {charCount}/{maxLength}
            </span>
          </div>
        </div>

        <div className="input-buttons">
          {/* 语音按钮 */}
          <button
            className={`voice-btn ${isVoiceRecording || isVoicePressed ? 'recording' : ''}`}
            onMouseDown={handleVoiceStart}
            onMouseUp={handleVoiceStop}
            onMouseLeave={handleVoiceLeave}
            onTouchStart={handleVoiceStart}
            onTouchEnd={handleVoiceStop}
            onContextMenu={(e) => e.preventDefault()} // 禁用右键菜单
            disabled={!isUnityConnected || disabled}
            title={isVoicePressed ? "按住说话中，松开停止" : (isVoiceRecording ? "Unity正在录音" : "按住说话")}
            style={{
              userSelect: 'none',
              WebkitUserSelect: 'none',
              MozUserSelect: 'none',
              msUserSelect: 'none',
              touchAction: 'none' // 防止移动端的触摸手势干扰
            }}
          >
            <span className="voice-icon">🎤</span>
            <span className="voice-text">
              {isVoiceRecording ? '录音中' : '语音'}
            </span>
          </button>

          {/* 发送按钮 */}
          <button
            className="send-btn"
            onClick={handleSendText}
            disabled={!canSend}
            title="发送消息"
          >
            <span className="send-icon">📤</span>
          </button>
        </div>
      </div>

      {/* 语音录制提示 */}
      {isVoiceRecording && (
        <div className="voice-recording">
          <div className="recording-indicator">
            <div className="recording-animation" />
            <span>正在录音，松开发送...</span>
          </div>
        </div>
      )}

      {/* 快捷回复已删除 */}
    </div>
  );
};

export default ChatInput;