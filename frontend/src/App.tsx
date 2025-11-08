import React, { useState, useEffect } from 'react';
import Header from './components/Header.tsx';
import { UnityContainer } from './components/UnityContainer.tsx';
import ChatContainer from './components/ChatUI/ChatContainer.tsx';
import FloatingButtons from './components/Mobile/FloatingButtons.tsx';
import ChatOverlay from './components/Mobile/ChatOverlay.tsx';
import { useUnityBridge } from './hooks/useUnityBridge.ts';
import './styles/App.css';

const App: React.FC = () => {
  const unityBridge = useUnityBridge();
  const [sessionDuration, setSessionDuration] = useState(0);
  
  // ============================================
  // 阶段2: 设备检测状态
  // ============================================
  const [isMobileVertical, setIsMobileVertical] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);

  // ============================================
  // 阶段3: 移动端交互状态
  // ============================================
  const [isChatOverlayOpen, setIsChatOverlayOpen] = useState(false);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);

  // 会话时长计时器
  useEffect(() => {
    const startTime = Date.now();
    const timer = setInterval(() => {
      setSessionDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // ============================================
  // 阶段2: 设备检测逻辑
  // ============================================
  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // 判断是否为移动端（宽度 <= 768px）
      const isMobile = width <= 768;
      
      // 判断是否为竖屏（高度 > 宽度）
      const isPortrait = height > width;
      
      // 判断是否为横屏
      const isLandscapeMode = width > height;
      
      // 移动端竖屏：需要特殊处理的情况
      const isMobileVerticalMode = isMobile && isPortrait;
      
      // 检查Unity画布尺寸
      const unityCanvas = document.querySelector('.unity-container canvas') as HTMLCanvasElement;
      if (unityCanvas) {
        console.log('🎮 Unity画布信息:', {
          canvas宽度: unityCanvas.width,
          canvas高度: unityCanvas.height,
          显示宽度: unityCanvas.offsetWidth,
          显示高度: unityCanvas.offsetHeight,
          宽高比: (unityCanvas.width / unityCanvas.height).toFixed(2)
        });
      }
      
      console.log('📱 设备检测:', {
        width,
        height,
        isMobile,
        isPortrait,
        isLandscape: isLandscapeMode,
        isMobileVertical: isMobileVerticalMode,
        设备宽高比: (width / height).toFixed(2)
      });
      
      // 额外的视觉提示日志
      if (isMobileVerticalMode) {
        console.log('🔴 当前模式: 移动端竖屏 - Unity画面已优化（放大1.3倍，聚焦角色）');
      } else if (isLandscapeMode && isMobile) {
        console.log('🟢 当前模式: 移动端横屏 - 显示完整UI');
      } else if (isLandscapeMode) {
        console.log('🟢 当前模式: 桌面横屏 - 显示完整UI');
      } else {
        console.log('🟡 当前模式: 桌面模式');
      }
      
      setIsMobileVertical(isMobileVerticalMode);
      setIsLandscape(isLandscapeMode);
    };
    
    // 初始检测
    checkDevice();
    
    // 延迟检测Unity画布（等待加载完成）
    setTimeout(checkDevice, 2000);
    
    // 监听窗口大小变化
    window.addEventListener('resize', checkDevice);
    
    // 监听屏幕方向变化（移动端）
    window.addEventListener('orientationchange', checkDevice);
    
    // 清理事件监听
    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', checkDevice);
    };
  }, []);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ============================================
  // 阶段3: 移动端交互处理函数
  // ============================================
  
  // 处理语音按钮：长按录音
  const handleVoicePress = (isRecording: boolean) => {
    setIsVoiceRecording(isRecording);
    
    if (isRecording) {
      console.log('🎤 开始录音...');
      // TODO: 阶段5 - 对接Unity语音功能
      // unityBridge.sendMessage('AudioManager', 'StartRecording', '');
    } else {
      console.log('⏹️ 停止录音');
      // TODO: 阶段5 - 对接Unity语音功能
      // unityBridge.sendMessage('AudioManager', 'StopRecording', '');
    }
  };

  // 处理文字按钮：展开对话遮罩
  const handleChatOpen = () => {
    console.log('💬 展开对话遮罩');
    setIsChatOverlayOpen(true);
  };

  // 处理遮罩关闭
  const handleChatClose = () => {
    console.log('❌ 关闭对话遮罩');
    setIsChatOverlayOpen(false);
  };

  return (
    <div className="app-container">
      {/* ============================================
          阶段2: 调试信息 - 移动端竖屏时隐藏
          ============================================ */}
      {!isMobileVertical && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: 'white',
          padding: '10px',
          borderRadius: '5px',
          zIndex: 1000,
          fontSize: '12px'
        }}>
          <div>Unity状态: {unityBridge.status.isUnityLoaded ? '已加载' : '未加载'}</div>
          <div>连接状态: {unityBridge.status.connectionStatus}</div>
          <div>会话时长: {formatDuration(sessionDuration)}</div>
          <div>设备模式: {isMobileVertical ? '移动竖屏' : (isLandscape ? '横屏' : '桌面')}</div>
        </div>
      )}

      {/* 顶部导航栏 */}
      <Header unityStatus={unityBridge.status} />

      {/* 主内容区域 */}
      <main className="main-content">
        {/* Unity游戏区域 */}
        <section className="unity-section">
          <UnityContainer unityBridge={unityBridge} />
        </section>

        {/* 聊天UI区域 - 移动端竖屏时隐藏 */}
        {!isMobileVertical && (
          <ChatContainer unityBridge={unityBridge} />
        )}
      </main>

      {/* ============================================
          阶段2: 底部信息栏 - 移动端竖屏时隐藏
          ============================================ */}
      {!isMobileVertical && (
        <footer className="app-footer">
          <div className="footer-content">
            <div className="footer-info">
              <span>Powered by Convai & Unity WebGL & React</span>
            </div>
            <div className="footer-stats">
              <span>会话时长: <span id="session-duration">{formatDuration(sessionDuration)}</span></span>
            </div>
          </div>
        </footer>
      )}

      {/* ============================================
          阶段3: 移动端浮动按钮 - 仅移动端竖屏显示
          ============================================ */}
      {isMobileVertical && (
        <FloatingButtons
          onVoicePress={handleVoicePress}
          onChatOpen={handleChatOpen}
          isChatOpen={isChatOverlayOpen}
        />
      )}

      {/* ============================================
          阶段3: 移动端对话遮罩 - 点击浮动按钮后显示
          ============================================ */}
      {isMobileVertical && (
        <ChatOverlay
          isOpen={isChatOverlayOpen}
          onClose={handleChatClose}
          unityBridge={unityBridge}
        />
      )}
    </div>
  );
};

export default App;
