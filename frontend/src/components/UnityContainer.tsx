import React, { useEffect, useState } from 'react';

interface UnityContainerProps {
  onUnityLoad?: () => void;
  onUnityError?: (error: Error) => void;
  unityBridge: ReturnType<typeof import('../hooks/useUnityBridge').useUnityBridge>; // 添加这行
}

export const UnityContainer: React.FC<UnityContainerProps> = ({ 
  onUnityLoad, 
  onUnityError, 
  unityBridge // 添加这个参数
}) => {
  // 移除这行：const { emit } = useUnityBridge();
  const { emit } = unityBridge; // 使用传递下来的 unityBridge
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    const iframe = document.getElementById('unity-iframe') as HTMLIFrameElement;
    
    // 监听来自Unity iframe的消息
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'UNITY_READY') {
        console.log('✅ 收到Unity准备就绪消息');
        setIsLoading(false);
        setLoadingProgress(100);
        onUnityLoad?.();
      } else if (event.data && event.data.type === 'UNITY_OUTPUT') {
        console.log('🛰️ 转发的UNITY_OUTPUT:', event.data.payload);
        
        // 使用事件系统转发消息
        emit('unity-output', event.data.payload);
      }
    };
    
    // 添加消息监听器
    window.addEventListener('message', handleMessage);
    
    const handleIframeLoad = () => {
      console.log(' Unity iframe已加载，等待Unity实例...');
      
      // 强制等待Unity加载完成
      setTimeout(() => {
        console.log('✅ Unity强制加载完成');
        setIsLoading(false);
        setLoadingProgress(100);
        onUnityLoad?.();
      }, 10000); // 等待10秒，确保Unity完全加载
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
      };
    }
  }, [onUnityLoad, onUnityError, emit]);

  const unityOrigin = (window as any).UNITY_ORIGIN || '';
  // 正确路径：指向frontend/public/unity-build/index.html
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

