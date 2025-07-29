import React from 'react';
import GpuDashboard from '../components/gpu/GpuDashboard';
import RefreshIndicator from '../components/common/RefreshIndicator';
import { useHealthDataContext } from '../contexts/HealthDataContext';

const GpuPage: React.FC = () => {
  const {
    isRefreshing,
    lastUpdated,
    timeSinceLastUpdate,
    refreshData
  } = useHealthDataContext();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">GPU Hardware</h1>
          <p className="text-gray-600">
            Real-time monitoring of GPU utilization, temperature, memory usage, and running processes
          </p>
        </div>
        <RefreshIndicator
          isRefreshing={isRefreshing}
          lastUpdated={lastUpdated}
          timeSinceLastUpdate={timeSinceLastUpdate}
          onRefresh={refreshData}
          className="text-right"
        />
      </div>

      <div className={`transition-opacity duration-200 ${isRefreshing ? 'opacity-75' : 'opacity-100'}`}>
        <GpuDashboard />
      </div>
    </div>
  );
};

export default GpuPage;