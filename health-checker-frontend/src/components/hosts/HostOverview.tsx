import React from 'react';
import { HostInfo } from '../../types/health';
import StatusBadge from '../common/StatusBadge';
import { Server, Wifi, WifiOff, MapPin } from 'lucide-react';

interface HostOverviewProps {
  hosts: HostInfo[];
}

const HostOverview: React.FC<HostOverviewProps> = ({ hosts }) => {
  const onlineHosts = hosts.filter(host => host.status === 'online');
  const offlineHosts = hosts.filter(host => host.status === 'offline');

  const getHostTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'manager':
        return '🎯';
      case 'agent':
        return '🤖';
      case 'gpu':
        return '⚡';
      case 'storage':
        return '💾';
      case 'web':
        return '🌐';
      case 'local':
        return '🏠';
      default:
        return '🖥️';
    }
  };

  const getHostTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      case 'agent':
        return 'bg-green-100 text-green-800';
      case 'gpu':
        return 'bg-purple-100 text-purple-800';
      case 'storage':
        return 'bg-orange-100 text-orange-800';
      case 'web':
        return 'bg-cyan-100 text-cyan-800';
      case 'local':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-6">
        <Server className="w-6 h-6 text-backend-ai-500" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Multi-Host Monitoring
          </h3>
          <p className="text-sm text-gray-600">
            {onlineHosts.length} online, {offlineHosts.length} offline out of {hosts.length} total hosts
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {hosts.map((host) => (
          <div
            key={host.id}
            className={`p-4 rounded-lg border-2 transition-all duration-200 ${
              host.status === 'online'
                ? 'border-green-200 bg-green-50 hover:bg-green-100'
                : 'border-red-200 bg-red-50 hover:bg-red-100'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getHostTypeIcon(host.type)}</span>
                <div>
                  <h4 className="font-medium text-gray-900">{host.name}</h4>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <MapPin className="w-3 h-3" />
                    <span>{host.host}:{host.port}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {host.status === 'online' ? (
                  <Wifi className="w-4 h-4 text-green-600" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-600" />
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${getHostTypeColor(
                  host.type
                )}`}
              >
                {host.type.toUpperCase()}
              </span>
              <StatusBadge
                status={host.status === 'online' ? 'Healthy' : 'Unhealthy'}
                size="sm"
              />
            </div>
          </div>
        ))}
      </div>

      {hosts.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Server className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No hosts configured</p>
          <p className="text-sm mt-1">
            Add hosts via .env file or hosts.csv to enable multi-host monitoring
          </p>
        </div>
      )}
    </div>
  );
};

export default HostOverview;