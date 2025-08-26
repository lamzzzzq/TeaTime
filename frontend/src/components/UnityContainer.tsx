import React, { useEffect, useState, useRef } from 'react';

interface UnityContainerProps {
  onUnityLoad?: () => void;
  onUnityError?: (error: Error) => void;
}

const UnityContainer: React.FC<UnityContainerProps> = ({
  onUnityLoad,
  onUnityError
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const iframe = document.getElementById('unity-iframe') as HTMLIFrameElement;
    
    // 监听来自Unity iframe的消息
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'UNITY_READY') {
        console.log('✅ 收到Unity准备就绪消息');
        setIsLoading(false);
        setLoadingProgress(100);
        onUnityLoad?.();
        
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
          checkIntervalRef.current = null;
        }
      } else if (event.data && event.data.type === 'UNITY_OUTPUT') {
        console.log('🛰️ 转发的UNITY_OUTPUT:', event.data.payload);
      }
    };
    
    // 添加消息监听器
    window.addEventListener('message', handleMessage);
    
    const handleIframeLoad = () => {
      console.log('🔄 Unity iframe已加载，等待Unity实例...');
      
      // 简化的Unity检测逻辑 - 不依赖iframe.contentWindow
      let attempts = 0;
      const maxAttempts = 200; // 20秒超时
      
      const checkUnityInstance = () => {
        attempts++;
        setLoadingProgress(Math.min((attempts / maxAttempts) * 100, 95));
        
        try {
          // 检查全局window.unityInstance（由Unity的index.html设置）
          if (window.unityInstance) {
            console.log('✅ Unity实例检测成功 (全局)!');
            setIsLoading(false);
            setLoadingProgress(100);
            onUnityLoad?.();
            
            if (checkIntervalRef.current) {
              clearInterval(checkIntervalRef.current);
              checkIntervalRef.current = null;
            }
            return;
          }
          
          // 每50次尝试（5秒）输出一次进度
          if (attempts % 50 === 0) {
            console.log(`🔄 等待Unity加载... (${Math.round(attempts/maxAttempts*100)}%)`);
          }
          
          if (attempts >= maxAttempts) {
            throw new Error(`Unity实例加载超时 (尝试${attempts}次，等待${maxAttempts/10}秒)`);
          }
          
        } catch (checkError) {
          if (attempts >= maxAttempts) {
            console.error('❌ Unity实例检测失败:', checkError);
            console.error('可能的原因:');
            console.error('1. Unity WebGL文件加载失败');
            console.error('2. Unity初始化脚本执行失败');
            console.error('3. 浏览器WebGL支持问题');
            
            const errorMsg = 'Unity实例加载超时或失败';
            setError(errorMsg);
            setIsLoading(false);
            onUnityError?.(new Error(errorMsg));
            
            if (checkIntervalRef.current) {
              clearInterval(checkIntervalRef.current);
              checkIntervalRef.current = null;
            }
          }
        }
      };
      
      // 开始定期检查
      checkIntervalRef.current = setInterval(checkUnityInstance, 100);
    };

    const handleIframeError = () => {
      console.error('❌ Unity iframe加载错误');
      const errorMsg = 'Unity WebGL iframe加载失败';
      setError(errorMsg);
      setIsLoading(false);
      onUnityError?.(new Error(errorMsg));
    };

    if (iframe) {
      iframe.addEventListener('load', handleIframeLoad);
      iframe.addEventListener('error', handleIframeError);

      return () => {
        iframe.removeEventListener('load', handleIframeLoad);
        iframe.removeEventListener('error', handleIframeError);
        window.removeEventListener('message', handleMessage);
        
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
          checkIntervalRef.current = null;
        }
      };
    }
  }, [onUnityLoad, onUnityError]);

  const unityOrigin = (window as any).UNITY_ORIGIN || (process.env.NODE_ENV !== 'production' ? 'http://localhost:3001' : '');
  // 只在首次挂载时生成一次带时间戳的地址，避免因组件重渲染导致iframe反复重载
  const [unitySrc] = useState(() => (
    unityOrigin ? `${unityOrigin}/unity-build/index.html?v=${Date.now()}` : `unity-build/index.html?v=${Date.now()}`
  ));

  return (
    <div className="unity-container">
      {/* 加载动画 */}
      {isLoading && (
        <div className="unity-loading">
          <div className="loading-spinner" />
          <p>Unity WebGL 加载中... {Math.round(loadingProgress)}%</p>
          <div className="loading-progress">
            <div 
              className="progress-bar" 
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <p className="loading-tip">
            {loadingProgress < 50 
              ? '正在加载iframe...' 
              : loadingProgress < 95 
                ? '正在等待Unity实例...' 
                : '正在初始化Unity...'
            }
          </p>
        </div>
      )}

      {/* 错误显示 */}
      {error && (
        <div className="unity-error">
          <div className="error-icon">⚠️</div>
          <h3>Unity 加载失败</h3>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="retry-button"
          >
            重新加载
          </button>
        </div>
      )}

      {/* Unity WebGL iframe */}
      <iframe 
        id="unity-iframe"
        src={unitySrc}
        style={{ 
          display: isLoading || error ? 'none' : 'block',
          width: '100%',
          height: '100%',
          border: 'none'
        }}
        allow="microphone; camera; fullscreen"
        title="Unity WebGL Game"
      />
    </div>
  );
};

export default UnityContainer;

