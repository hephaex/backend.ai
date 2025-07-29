import React from 'react';
import { ServiceCategory } from '../types/health';
import { useHealthDataContext } from '../contexts/HealthDataContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import OverviewStats from '../components/dashboard/OverviewStats';
import ServiceList from '../components/dashboard/ServiceList';
import HostOverview from '../components/hosts/HostOverview';
import RefreshIndicator from '../components/common/RefreshIndicator';

const OverviewPage: React.FC = () => {
  const {
    healthData: healthReport,
    isLoading: loading,
    error,
    isRefreshing,
    lastUpdated,
    timeSinceLastUpdate,
    refreshData
  } = useHealthDataContext();

  const categorizeServices = (checks: any[]): ServiceCategory[] => {
    const categories: ServiceCategory[] = [
      { name: 'Docker Containers', services: [], icon: '🐳' },
      { name: 'Infrastructure Services', services: [], icon: '🛠️' },
      { name: 'Backend.AI Services', services: [], icon: '🚀' },
      { name: 'GPU Hardware', services: [], icon: '⚡' },
    ];

    checks.forEach((check) => {
      if (check.service_name.includes('backend.ai') || check.service_name.includes('halfstack')) {
        categories[0].services.push(check);
      } else if (['PostgreSQL', 'Redis', 'etcd'].includes(check.service_name)) {
        categories[1].services.push(check);
      } else if (['Manager API', 'Prometheus', 'Grafana'].includes(check.service_name)) {
        categories[2].services.push(check);
      } else if (check.service_name.includes('GPU') || check.service_name.includes('gpu')) {
        categories[3].services.push(check);
      } else {
        // Default to Docker containers for unknown services
        categories[0].services.push(check);
      }
    });

    return categories.filter(category => category.services.length > 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" message="Loading system health data..." />
      </div>
    );
  }

  if (error || !healthReport) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">System Overview</h1>
            <p className="text-gray-600">
              Comprehensive health monitoring for Backend.AI infrastructure and GPU resources across multiple hosts
            </p>
          </div>
          <RefreshIndicator
            isRefreshing={isRefreshing}
            lastUpdated={lastUpdated}
            timeSinceLastUpdate={timeSinceLastUpdate}
            onRefresh={refreshData}
          />
        </div>
        
        <div className="card text-center">
          <div className="text-red-600 mb-2">
            <h3 className="text-lg font-semibold">Failed to Load Health Data</h3>
            <p className="text-sm text-gray-600 mt-2">{error}</p>
            <button
              onClick={refreshData}
              className="btn-primary mt-4"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const serviceCategories = categorizeServices(healthReport.checks);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">System Overview</h1>
          <p className="text-gray-600">
            Comprehensive health monitoring for Backend.AI infrastructure and GPU resources across multiple hosts
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
        <OverviewStats report={healthReport} />

        {healthReport?.hosts && healthReport.hosts.length > 0 && (
          <div className="mt-8">
            <HostOverview hosts={healthReport.hosts} />
          </div>
        )}

        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Service Health Status</h2>
            {isRefreshing && (
              <div className="flex items-center space-x-2 text-blue-600">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                <span className="text-sm">Updating data...</span>
              </div>
            )}
          </div>
          <ServiceList categories={serviceCategories} />
        </div>
      </div>
    </div>
  );
};

export default OverviewPage;