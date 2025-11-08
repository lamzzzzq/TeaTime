import React from 'react';
import { UnityBridgeStatus } from '../types/unity.ts';

interface HeaderProps {
  unityStatus: UnityBridgeStatus;
}

const Header: React.FC<HeaderProps> = ({ unityStatus }) => {
  return (
    <header className="app-header">
      <div className="header-content">
        <h1 className="app-title">
          <span className="logo-icon">🤖</span>
          Bryant Hui
        </h1>
      </div>
    </header>
  );
};

export default Header;