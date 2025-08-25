import React from 'react';

interface RealtimeDebugProps {
  isConnected: boolean;
  isHealthy: boolean;
  fallbackPolling: boolean;
  reconnectAttempts: number;
  localVersion: number;
}

export const RealtimeDebug: React.FC<RealtimeDebugProps> = ({
  isConnected,
  isHealthy,
  fallbackPolling,
  reconnectAttempts,
  localVersion
}) => {
  const getStatusColor = () => {
    if (isConnected && isHealthy) return 'text-green-500';
    if (fallbackPolling) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getStatusText = () => {
    if (isConnected && isHealthy) return '🟢 Connected';
    if (fallbackPolling) return '🟡 Polling';
    if (reconnectAttempts > 0) return `🔄 Reconnecting (${reconnectAttempts})`;
    return '🔴 Offline';
  };

  return (
    <div className="fixed top-4 right-4 bg-black/80 text-white p-2 rounded text-xs font-mono z-50">
      <div className={`font-bold ${getStatusColor()}`}>
        {getStatusText()}
      </div>
      <div className="text-gray-300 space-y-1 mt-1">
        <div>WS: {isConnected ? '✓' : '✗'}</div>
        <div>Health: {isHealthy ? '✓' : '✗'}</div>
        <div>Polling: {fallbackPolling ? '✓' : '✗'}</div>
        <div>Version: {localVersion}</div>
        <div>Attempts: {reconnectAttempts}</div>
      </div>
    </div>
  );
};