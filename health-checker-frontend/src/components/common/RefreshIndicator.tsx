import React from 'react';
import { RefreshCw, Clock } from 'lucide-react';

interface RefreshIndicatorProps {
  isRefreshing: boolean;
  lastUpdated: Date | null;
  timeSinceLastUpdate: number;
  onRefresh: () => void;
  className?: string;
}

const RefreshIndicator: React.FC<RefreshIndicatorProps> = ({
  isRefreshing,
  lastUpdated,
  timeSinceLastUpdate,
  onRefresh,
  className = ''
}) => {
  const formatTimeAgo = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s ago`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}m ago`;
    } else {
      return `${Math.floor(seconds / 3600)}h ago`;
    }
  };

  const getUpdateStatus = (): { color: string; text: string } => {
    if (isRefreshing) {
      return { color: 'text-blue-600', text: 'Updating...' };
    } else if (timeSinceLastUpdate <= 10) {
      return { color: 'text-green-600', text: 'Up to date' };
    } else if (timeSinceLastUpdate <= 30) {
      return { color: 'text-yellow-600', text: 'Recently updated' };
    } else {
      return { color: 'text-red-600', text: 'Stale data' };
    }
  };

  const status = getUpdateStatus();

  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      {/* Auto-refresh indicator */}
      <div className="flex items-center space-x-2">
        <div className="relative">
          <RefreshCw 
            className={`h-4 w-4 ${status.color} ${
              isRefreshing ? 'animate-spin' : ''
            }`}
          />
          {!isRefreshing && (
            <div className="absolute -top-1 -right-1">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          )}
        </div>
        <span className={`text-sm font-medium ${status.color}`}>
          {status.text}
        </span>
      </div>

      {/* Last updated time */}
      {lastUpdated && (
        <div className="flex items-center space-x-2 text-gray-500">
          <Clock className="h-4 w-4" />
          <span className="text-sm">
            {formatTimeAgo(timeSinceLastUpdate)}
          </span>
        </div>
      )}

      {/* Manual refresh button */}
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
        title="Refresh now"
      >
        <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
        <span>Refresh</span>
      </button>

      {/* Next update countdown */}
      <div className="flex items-center space-x-1 text-xs text-gray-400">
        <span>Next update in:</span>
        <span className="font-mono">
          {Math.max(0, 10 - (timeSinceLastUpdate % 10))}s
        </span>
      </div>
    </div>
  );
};

export default RefreshIndicator;