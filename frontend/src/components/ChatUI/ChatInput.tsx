import React, { useState, useRef, useCallback } from 'react';

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

  const handleVoiceStart = useCallback(() => {
    if (!disabled) {
      onStartVoice();
    }
  }, [disabled, onStartVoice]);

  const handleVoiceStop = useCallback(() => {
    onStopVoice();
  }, [onStopVoice]);

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
            className={`voice-btn ${isVoiceRecording ? 'recording' : ''}`}
            onMouseDown={handleVoiceStart}
            onMouseUp={handleVoiceStop}
            onMouseLeave={handleVoiceStop}
            onTouchStart={handleVoiceStart}
            onTouchEnd={handleVoiceStop}
            disabled={!isUnityConnected || disabled}
            title={isVoiceRecording ? "松开停止录音" : "按住说话"}
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

      {/* 快捷回复建议 */}
      {inputText === '' && (
        <div className="quick-replies">
          <div className="quick-replies-title">快捷回复：</div>
          <div className="quick-replies-list">
            {['你好', '谢谢', '再见', '请问...'].map((text) => (
              <button
                key={text}
                className="quick-reply-btn"
                onClick={() => setInputText(text)}
              >
                {text}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInput;

