import React from 'react';
import { Wifi, WifiOff, RotateCcw, Activity } from 'lucide-react';

interface ConnectionStatusProps {
  isConnected: boolean;
  isHealthy: boolean;
  fallbackPolling: boolean;
  reconnectAttempts?: number;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  isHealthy,
  fallbackPolling,
  reconnectAttempts = 0,
  className = '',
  size = 'medium',
  showLabel = true
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'text-xs gap-1';
      case 'large':
        return 'text-lg gap-3';
      default:
        return 'text-sm gap-2';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 'w-3 h-3';
      case 'large':
        return 'w-6 h-6';
      default:
        return 'w-4 h-4';
    }
  };

  const getStatus = () => {
    if (isConnected && isHealthy) {
      return {
        icon: <Wifi className={`${getIconSize()} text-green-400`} />,
        label: 'Live',
        color: 'text-green-400',
        bgColor: 'bg-green-500/20',
        borderColor: 'border-green-400/50'
      };
    } else if (fallbackPolling) {
      return {
        icon: <Activity className={`${getIconSize()} text-yellow-400 animate-pulse`} />,
        label: 'Backup Mode',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20',
        borderColor: 'border-yellow-400/50'
      };
    } else {
      return {
        icon: <WifiOff className={`${getIconSize()} text-red-400`} />,
        label: reconnectAttempts > 0 ? 'Reconnecting...' : 'Offline',
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        borderColor: 'border-red-400/50'
      };
    }
  };

  const status = getStatus();

  return (
    <div className={`inline-flex items-center ${getSizeClasses()} ${status.bgColor} px-2 py-1 rounded-full border ${status.borderColor} ${className}`}>
      {status.icon}
      {showLabel && (
        <span className={`font-medium ${status.color}`}>
          {status.label}
        </span>
      )}
      {reconnectAttempts > 0 && (
        <div className="flex items-center gap-1">
          <RotateCcw className={`${getIconSize()} text-gray-400 animate-spin`} />
          <span className="text-gray-400 text-xs">({reconnectAttempts})</span>
        </div>
      )}
    </div>
  );
};