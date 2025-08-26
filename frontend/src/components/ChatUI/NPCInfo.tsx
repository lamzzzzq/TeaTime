import React from 'react';
import { NPCInfo as NPCInfoType } from '../../types/unity.ts';

interface NPCInfoProps {
  npc: NPCInfoType;
  isTalking: boolean;
}

const NPCInfo: React.FC<NPCInfoProps> = ({ npc, isTalking }) => {
  return (
    <div className="current-npc">
      <div className="npc-avatar">
        <span className="avatar-placeholder">👤</span>
      </div>
      
      <div className="npc-info">
        <div className="npc-name">{npc.name}</div>
        <div className="npc-status">
          {npc.status || '在线'}
        </div>
      </div>
      
      {/* 说话指示器 */}
      <div className={`talking-indicator ${isTalking ? 'active' : ''}`}>
        <span className="talking-dots">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </div>
    </div>
  );
};

export default NPCInfo;
