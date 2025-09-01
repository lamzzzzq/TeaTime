/**
 * API配置文件
 * 根据环境自动选择正确的API地址
 */

// 获取API基础URL
const getApiBaseUrl = (): string => {
  // 优先使用环境变量
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // 根据当前域名自动判断
  const { protocol, hostname, port } = window.location;
  
  // 生产环境：使用当前域名
  if (process.env.NODE_ENV === 'production') {
    // 如果是通过端口访问，假设后端在同一地址
    if (port && port !== '80' && port !== '443') {
      return `${protocol}//${hostname}:${port}`;
    }
    // 标准部署：后端和前端在同一域名
    return `${protocol}//${hostname}`;
  }
  
  // 开发环境：默认后端端口3001
  return `${protocol}//${hostname}:3001`;
};

export const API_CONFIG = {
  BASE_URL: getApiBaseUrl(),
  ENDPOINTS: {
    HEALTH: '/api/health',
    INFO: '/api/info',
    UNITY_STATUS: '/api/unity/status',
    CHAT_STATS: '/api/chat/stats'
  }
};

// Unity WebGL构建路径
export const UNITY_CONFIG = {
  BUILD_URL: process.env.REACT_APP_UNITY_BUILD_URL || '/unity-build'
};

// 应用配置
export const APP_CONFIG = {
  TITLE: process.env.REACT_APP_TITLE || 'Convai Web Chat',
  DEBUG: process.env.REACT_APP_DEBUG === 'true'
};

// 导出便于使用的函数
export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// 调试信息
if (APP_CONFIG.DEBUG) {
  console.log('🔧 API Configuration:', {
    baseUrl: API_CONFIG.BASE_URL,
    unityBuildUrl: UNITY_CONFIG.BUILD_URL,
    environment: process.env.NODE_ENV
  });
}
