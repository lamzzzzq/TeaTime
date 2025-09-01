import React from 'react';
import './styles/App.css';

const App: React.FC = () => {
  return (
    <div className="app-container">
      {/* 测试信息 */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        background: 'white',
        padding: '20px',
        borderRadius: '5px',
        zIndex: 1000,
        fontSize: '14px',
        border: '2px solid #4f46e5'
      }}>
        <h3>🎉 Convai Web v3 部署成功！</h3>
        <p>✅ React 应用正常运行</p>
        <p>✅ 样式文件正常加载</p>
        <p>✅ 网站可以正常访问</p>
        <p>🔄 正在加载完整功能...</p>
      </div>

      {/* 主要内容 */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        textAlign: 'center',
        padding: '20px'
      }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
          🤖 Convai Web v3
        </h1>
        <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>
          AI对话系统 + Unity WebGL + React
        </p>
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          padding: '20px',
          borderRadius: '10px',
          backdropFilter: 'blur(10px)'
        }}>
          <p>🌐 部署状态: 成功</p>
          <p>📱 平台: Netlify</p>
          <p>🔗 访问: 24小时在线</p>
          <p>🚀 版本: v3.0</p>
        </div>
        
        <div style={{ marginTop: '2rem', fontSize: '0.9rem', opacity: 0.8 }}>
          <p>正在初始化完整功能，请稍候...</p>
        </div>
      </div>
    </div>
  );
};

export default App;
