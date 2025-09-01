// Unity相关类型定义
export interface UnityMessage {
  type: 'text' | 'voice_start' | 'voice_stop' | 'user_text' | 'npc_text' | 'talking_status';
  content: string;
  source: 'web' | 'unity';
  timestamp: string;
  npcName?: string;
  sessionId?: string;
  characterId?: string;
  additionalData?: Record<string, any>;
}

// Unity输入数据格式（发送到Unity）
export interface WebInputData {
  type: 'text' | 'voice_start' | 'voice_stop';
  content?: string;
  source: 'web';
}

// Unity输出数据格式（从Unity接收）
export interface UnityOutputData {
  type: 'user_text' | 'npc_text' | 'talking_status';
  content: string;
  npcName?: string;
  timestamp: string;
  additionalData?: {
    isTalking?: boolean;
    [key: string]: any;
  };
}

export interface UnityBridgeStatus {
  isUnityLoaded: boolean;
  isVoiceRecording: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  hasUnityInstance: boolean;
  queuedMessages: number;
  lastHeartbeat?: Date;
}

export interface NPCInfo {
  name: string;
  id?: string;
  status?: string;
  isTalking?: boolean;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'npc' | 'system';
  content: string;
  timestamp: Date;
  npcName?: string;
  status: 'sent' | 'pending' | 'error'; // 添加这行
}

