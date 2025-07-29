import React from 'react';
import { Activity } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import RefreshIndicator from '../common/RefreshIndicator';
import { useHealthDataContext } from '../../contexts/HealthDataContext';

const Header: React.FC = () => {
  const {
    healthData,
    isRefreshing,
    lastUpdated,
    refreshData,
    timeSinceLastUpdate
  } = useHealthDataContext();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-backend-ai-100 rounded-lg">
              <Activity className="w-8 h-8 text-backend-ai-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Backend.AI Health Monitor
              </h1>
              <p className="text-sm text-gray-600">
                Real-time infrastructure monitoring with 10-second refresh intervals
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge 
                status={healthData?.overall_status || 'Unknown'} 
                size="sm" 
              />
              <span className="text-sm font-medium text-gray-900">System Status</span>
            </div>
          </div>

          <RefreshIndicator
            isRefreshing={isRefreshing}
            lastUpdated={lastUpdated}
            timeSinceLastUpdate={timeSinceLastUpdate}
            onRefresh={refreshData}
          />
        </div>
      </div>
    </header>
  );
};

export default Header;