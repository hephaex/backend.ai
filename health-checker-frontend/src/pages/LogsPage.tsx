import React, { useState, useEffect } from 'react';
import { LogService } from '../types/logs';
import { HealthCheckAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import LogViewer from '../components/logs/LogViewer';
import { FileText, Database, Server, Cpu, HardDrive } from 'lucide-react';

const LogsPage: React.FC = () => {
  const [services, setServices] = useState<LogService[]>([]);
  const [selectedService, setSelectedService] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLogServices();
  }, []);

  const fetchLogServices = async () => {
    try {
      setLoading(true);
      const result = await HealthCheckAPI.getLogServices();
      setServices(result.services);
      
      // Select first service by default
      if (result.services.length > 0) {
        setSelectedService(result.services[0].name);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch log services');
    } finally {
      setLoading(false);
    }
  };

  const getServiceIcon = (serviceName: string) => {
    switch (serviceName.toLowerCase()) {
      case 'etcd':
        return <Database className="w-5 h-5" />;
      case 'redis':
        return <HardDrive className="w-5 h-5" />;
      case 'manager':
        return <Server className="w-5 h-5" />;
      case 'agent':
        return <Cpu className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getServiceColor = (serviceName: string) => {
    switch (serviceName.toLowerCase()) {
      case 'etcd':
        return 'text-blue-600 bg-blue-100 hover:bg-blue-200';
      case 'redis':
        return 'text-red-600 bg-red-100 hover:bg-red-200';
      case 'manager':
        return 'text-green-600 bg-green-100 hover:bg-green-200';
      case 'agent':
        return 'text-purple-600 bg-purple-100 hover:bg-purple-200';
      default:
        return 'text-gray-600 bg-gray-100 hover:bg-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" message="Loading log services..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card text-center">
        <div className="text-red-600 mb-2">
          <h3 className="text-lg font-semibold">Failed to Load Log Services</h3>
          <p className="text-sm text-gray-600 mt-2">{error}</p>
          <button
            onClick={fetchLogServices}
            className="btn-primary mt-4"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const selectedServiceData = services.find(s => s.name === selectedService);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Service Logs</h1>
        <p className="text-gray-600">
          Monitor and analyze logs from ETCD, Redis, Backend.AI Manager, and Agent services
        </p>
      </div>

      {/* Service Selector */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Service</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {services.map((service) => (
            <button
              key={service.name}
              onClick={() => setSelectedService(service.name)}
              className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                selectedService === service.name
                  ? 'border-backend-ai-500 bg-backend-ai-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${getServiceColor(service.name)}`}>
                  {getServiceIcon(service.name)}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">
                    {service.displayName}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {service.types.join(', ')} logs
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                {service.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Log Viewer */}
      {selectedServiceData && (
        <LogViewer
          key={selectedService} // Force re-render when service changes
          service={selectedService}
          displayName={selectedServiceData.displayName}
        />
      )}

      {/* Service Information */}
      {selectedServiceData && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Service Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Service Details</h4>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Name:</dt>
                  <dd className="text-gray-900">{selectedServiceData.displayName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Service ID:</dt>
                  <dd className="text-gray-900 font-mono">{selectedServiceData.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Log Types:</dt>
                  <dd className="text-gray-900">{selectedServiceData.types.join(', ')}</dd>
                </div>
              </dl>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Description</h4>
              <p className="text-sm text-gray-600">
                {selectedServiceData.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Log Management Tips */}
      <div className="card bg-blue-50 border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">
          💡 Log Management Tips
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Real-time Monitoring</h4>
            <ul className="text-blue-800 space-y-1 list-disc list-inside">
              <li>Use the "Stream" button for live log monitoring</li>
              <li>Enable auto-scroll to follow new log entries</li>
              <li>Adjust the number of lines to control data volume</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Log Analysis</h4>
            <ul className="text-blue-800 space-y-1 list-disc list-inside">
              <li>Use search functionality to find specific events</li>
              <li>Download logs for offline analysis</li>
              <li>Monitor different log types (main/error) separately</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogsPage;