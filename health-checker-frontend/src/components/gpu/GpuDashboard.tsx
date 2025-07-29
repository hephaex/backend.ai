import React from 'react';
import { GpuInfo } from '../../types/health';
import { useHealthDataContext } from '../../contexts/HealthDataContext';
import LoadingSpinner from '../common/LoadingSpinner';
import { Zap, Thermometer, MemoryStick, Cpu, HardDrive } from 'lucide-react';

const GpuDashboard: React.FC = () => {
  const { healthData, isLoading: loading, error } = useHealthDataContext();
  
  // Extract GPU data from health report
  const gpuData: GpuInfo[] = healthData?.gpu_details || [];

  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization < 30) return 'bg-green-500';
    if (utilization < 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTemperatureColor = (temp: number) => {
    if (temp < 60) return 'text-green-600';
    if (temp < 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" message="Loading GPU information..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card text-center">
        <div className="text-red-600 mb-2">
          <Zap className="w-12 h-12 mx-auto mb-4" />
          <h3 className="text-lg font-semibold">GPU Data Unavailable</h3>
          <p className="text-sm text-gray-600 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (gpuData.length === 0) {
    return (
      <div className="card text-center">
        <div className="text-gray-600 mb-2">
          <Zap className="w-12 h-12 mx-auto mb-4" />
          <h3 className="text-lg font-semibold">No GPU Detected</h3>
          <p className="text-sm text-gray-600 mt-2">
            No supported GPU hardware was found on this system.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {gpuData.map((gpu) => (
        <div key={gpu.id} className="card">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-gray-900">{gpu.name}</h2>
              <span className="text-sm text-gray-500">GPU {gpu.id}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>Driver: {gpu.driver_version}</div>
              {gpu.cuda_version && <div>CUDA: {gpu.cuda_version}</div>}
              {gpu.uuid && <div className="col-span-2 truncate">UUID: {gpu.uuid}</div>}
            </div>
          </div>

          {/* GPU Utilization */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="metric-card">
              <div className="flex items-center gap-2 mb-3">
                <Cpu className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">GPU Utilization</h3>
              </div>
              <div className="mb-2">
                <div className="flex justify-between text-sm mb-1">
                  <span>GPU</span>
                  <span className="font-medium">{gpu.utilization_gpu}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getUtilizationColor(gpu.utilization_gpu)}`}
                    style={{ width: `${gpu.utilization_gpu}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Memory</span>
                  <span className="font-medium">{gpu.utilization_memory}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getUtilizationColor(gpu.utilization_memory)}`}
                    style={{ width: `${gpu.utilization_memory}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="metric-card">
              <div className="flex items-center gap-2 mb-3">
                <MemoryStick className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900">Memory Usage</h3>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {formatBytes(gpu.memory_used)} / {formatBytes(gpu.memory_total)}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                <div
                  className={`h-3 rounded-full ${getUtilizationColor((gpu.memory_used / gpu.memory_total) * 100)}`}
                  style={{ width: `${(gpu.memory_used / gpu.memory_total) * 100}%` }}
                ></div>
              </div>
              <div className="text-sm text-gray-600">
                {((gpu.memory_used / gpu.memory_total) * 100).toFixed(1)}% used
              </div>
            </div>
          </div>

          {/* Temperature and Power */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="metric-card">
              <div className="flex items-center gap-2 mb-2">
                <Thermometer className="w-5 h-5 text-orange-600" />
                <h3 className="font-semibold text-gray-900">Temperature</h3>
              </div>
              <div className={`text-3xl font-bold ${getTemperatureColor(gpu.temperature)}`}>
                {gpu.temperature}°C
              </div>
            </div>

            <div className="metric-card">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-yellow-600" />
                <h3 className="font-semibold text-gray-900">Power Usage</h3>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {gpu.power_usage.toFixed(1)}W
              </div>
              <div className="text-sm text-gray-600">
                / {gpu.power_limit.toFixed(0)}W ({((gpu.power_usage / gpu.power_limit) * 100).toFixed(1)}%)
              </div>
            </div>

            {gpu.fan_speed && (
              <div className="metric-card">
                <div className="flex items-center gap-2 mb-2">
                  <HardDrive className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Fan Speed</h3>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {gpu.fan_speed} RPM
                </div>
              </div>
            )}
          </div>

          {/* Running Processes */}
          {gpu.processes.length > 0 && (
            <div className="metric-card">
              <h3 className="font-semibold text-gray-900 mb-4">Running Processes</h3>
              <div className="space-y-2">
                {gpu.processes.map((process) => (
                  <div key={process.pid} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-gray-600">
                        PID {process.pid}
                      </span>
                      <span className="font-medium text-gray-900">
                        {process.name}
                      </span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {formatBytes(process.memory_used)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default GpuDashboard;