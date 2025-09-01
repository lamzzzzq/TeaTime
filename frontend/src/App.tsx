import React, { useState, useEffect } from 'react';
import Header from './components/Header.tsx';
import { UnityContainer } from './components/UnityContainer.tsx'; // 改为命名导入
import ChatContainer from './components/ChatUI/ChatContainer.tsx';
import { useUnityBridge } from './hooks/useUnityBridge.ts';
import './styles/App.css';

const App: React.FC = () => {
  const unityBridge = useUnityBridge();
  const [sessionDuration, setSessionDuration] = useState(0);

  // 会话时长计时器
  useEffect(() => {
    const startTime = Date.now();
    const timer = setInterval(() => {
      setSessionDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
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

  return (
    <div className="app-container">
      {/* 顶部导航栏 */}
      <Header unityStatus={unityBridge.status} />

      {/* 主内容区域 */}
      <main className="main-content">
        {/* Unity游戏区域 */}
        <section className="unity-section">
          <UnityContainer unityBridge={unityBridge} /> {/* 传递 unityBridge */}
        </section>

        {/* 聊天UI区域 */}
        <ChatContainer unityBridge={unityBridge} />
      </main>

      {/* 底部信息栏 */}
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
    </div>
  );
};

export default App;
