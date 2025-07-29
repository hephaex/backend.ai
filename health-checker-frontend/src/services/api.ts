import axios from 'axios';
import { HealthReport, GpuInfo, HostInfo } from '../types/health';
import { ServiceLog, LogStats, LogSearchResult, LogService } from '../types/logs';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Response Error:', error);
    if (error.response?.status === 404) {
      console.warn('API endpoint not found - using mock data');
    }
    return Promise.reject(error);
  }
);

export class HealthCheckAPI {
  // Get all health checks
  static async getAllHealthChecks(): Promise<HealthReport> {
    try {
      const response = await api.get<HealthReport>('/api/health/all');
      return response.data;
    } catch (error) {
      console.warn('API not available, using mock data');
      return this.getMockHealthReport();
    }
  }

  // Get Docker container health checks
  static async getDockerHealthChecks(): Promise<HealthReport> {
    try {
      const response = await api.get<HealthReport>('/api/health/docker');
      return response.data;
    } catch (error) {
      console.warn('API not available, using mock data');
      return this.getMockDockerReport();
    }
  }

  // Get GPU health checks
  static async getGpuHealthChecks(): Promise<HealthReport> {
    try {
      const response = await api.get<HealthReport>('/api/health/gpu');
      return response.data;
    } catch (error) {
      console.warn('API not available, using mock data');
      return this.getMockGpuReport();
    }
  }

  // Get infrastructure health checks
  static async getInfrastructureHealthChecks(): Promise<HealthReport> {
    try {
      const response = await api.get<HealthReport>('/api/health/infrastructure');
      return response.data;
    } catch (error) {
      console.warn('API not available, using mock data');
      return this.getMockInfrastructureReport();
    }
  }

  // Get Backend.AI services health checks
  static async getServicesHealthChecks(): Promise<HealthReport> {
    try {
      const response = await api.get<HealthReport>('/api/health/services');
      return response.data;
    } catch (error) {
      console.warn('API not available, using mock data');
      return this.getMockServicesReport();
    }
  }

  // Get detailed GPU information
  static async getGpuDetails(): Promise<GpuInfo[]> {
    try {
      const response = await api.get<GpuInfo[]>('/api/gpu/details');
      return response.data;
    } catch (error) {
      console.warn('API not available, using mock data');
      return this.getMockGpuDetails();
    }
  }

  // Host management methods
  static async getHosts(): Promise<{hosts: HostInfo[], total: number, enabled: number}> {
    try {
      const response = await api.get('/api/hosts');
      return response.data;
    } catch (error) {
      console.warn('API not available, using mock data');
      return {
        hosts: [
          {
            id: 'localhost',
            name: 'localhost',
            host: 'localhost',
            port: 8095,
            type: 'local',
            status: 'online',
          }
        ],
        total: 1,
        enabled: 1,
      };
    }
  }

  static async addHost(hostConfig: Partial<HostInfo>): Promise<HostInfo> {
    const response = await api.post('/api/hosts', hostConfig);
    return response.data;
  }

  static async updateHost(id: string, updates: Partial<HostInfo>): Promise<HostInfo> {
    const response = await api.put(`/api/hosts/${id}`, updates);
    return response.data;
  }

  static async removeHost(id: string): Promise<{message: string, host: HostInfo}> {
    const response = await api.delete(`/api/hosts/${id}`);
    return response.data;
  }

  // Log management methods
  static async getLogServices(): Promise<{services: LogService[], total: number}> {
    try {
      const response = await api.get('/api/logs');
      return response.data;
    } catch (error) {
      console.warn('API not available, using mock data');
      return {
        services: [
          { name: 'etcd', displayName: 'ETCD', description: 'Distributed key-value store logs', types: ['main', 'error'] },
          { name: 'redis', displayName: 'Redis', description: 'In-memory data structure store logs', types: ['main', 'error'] },
          { name: 'manager', displayName: 'Backend.AI Manager', description: 'Backend.AI Manager service logs', types: ['main'] },
          { name: 'agent', displayName: 'Backend.AI Agent', description: 'Backend.AI Agent service logs', types: ['main'] },
        ],
        total: 4,
      };
    }
  }

  static async getServiceLogs(service: string, options: {
    lines?: number;
    type?: string;
    source?: string;
  } = {}): Promise<ServiceLog> {
    const params = new URLSearchParams();
    if (options.lines) params.append('lines', options.lines.toString());
    if (options.type) params.append('type', options.type);
    if (options.source) params.append('source', options.source);

    const response = await api.get(`/api/logs/${service}?${params.toString()}`);
    return response.data;
  }

  static async getLogStats(service: string): Promise<LogStats> {
    const response = await api.get(`/api/logs/${service}/stats`);
    return response.data;
  }

  static async searchLogs(service: string, options: {
    query: string;
    lines?: number;
    caseSensitive?: boolean;
    regex?: boolean;
  }): Promise<LogSearchResult> {
    const response = await api.post(`/api/logs/${service}/search`, options);
    return response.data;
  }

  // Mock data methods for development
  private static getMockHealthReport(): HealthReport {
    return {
      timestamp: new Date().toISOString(),
      overall_status: 'Degraded',
      total_checks: 20,
      healthy_count: 15,
      unhealthy_count: 3,
      degraded_count: 1,
      unknown_count: 1,
      checks: [
        {
          service_name: 'PostgreSQL',
          status: 'Healthy',
          response_time_ms: 125,
          details: 'Connected - PostgreSQL 15.3',
          timestamp: new Date().toISOString(),
        },
        {
          service_name: 'Redis',
          status: 'Healthy',
          response_time_ms: 18,
          details: 'PING successful',
          timestamp: new Date().toISOString(),
        },
        {
          service_name: 'Manager API',
          status: 'Unhealthy',
          response_time_ms: 5000,
          details: 'Connection refused - service may be down',
          timestamp: new Date().toISOString(),
          error_message: 'Connection refused',
        },
        {
          service_name: 'NVIDIA GPU 0',
          status: 'Healthy',
          response_time_ms: 156,
          details: 'RTX 4090 - GPU: 45%, Mem: 12.5%, Temp: 65°C, Power: 180.5W',
          timestamp: new Date().toISOString(),
        },
        {
          service_name: 'backend.ai-halfstack-prometheus-1',
          status: 'Healthy',
          response_time_ms: 45,
          details: 'Running since 2025-07-28T08:00',
          timestamp: new Date().toISOString(),
        },
      ],
      summary: 'Health Check Summary: 15 healthy, 3 unhealthy, 1 degraded, 1 unknown out of 20 total services',
    };
  }

  private static getMockDockerReport(): HealthReport {
    return {
      timestamp: new Date().toISOString(),
      overall_status: 'Healthy',
      total_checks: 13,
      healthy_count: 11,
      unhealthy_count: 0,
      degraded_count: 0,
      unknown_count: 2,
      checks: [
        {
          service_name: 'backend.ai-halfstack-postgres-1',
          status: 'Healthy',
          response_time_ms: 45,
          details: 'Running since 2025-07-28T08:00',
          timestamp: new Date().toISOString(),
        },
        {
          service_name: 'backend.ai-halfstack-redis-1',
          status: 'Healthy',
          response_time_ms: 32,
          details: 'Running since 2025-07-28T08:00',
          timestamp: new Date().toISOString(),
        },
        {
          service_name: 'backend.ai-halfstack-etcd-1',
          status: 'Unknown',
          response_time_ms: 0,
          details: 'Running since 2025-07-28T08:00',
          timestamp: new Date().toISOString(),
        },
      ],
      summary: 'Health Check Summary: 11 healthy, 0 unhealthy, 0 degraded, 2 unknown out of 13 total services',
    };
  }

  private static getMockGpuReport(): HealthReport {
    return {
      timestamp: new Date().toISOString(),
      overall_status: 'Healthy',
      total_checks: 1,
      healthy_count: 1,
      unhealthy_count: 0,
      degraded_count: 0,
      unknown_count: 0,
      checks: [
        {
          service_name: 'NVIDIA GPU 0',
          status: 'Healthy',
          response_time_ms: 156,
          details: 'RTX 4090 - GPU: 45%, Mem: 12.5%, Temp: 65°C, Power: 180.5W',
          timestamp: new Date().toISOString(),
        },
      ],
      summary: 'Health Check Summary: 1 healthy, 0 unhealthy, 0 degraded, 0 unknown out of 1 total services',
    };
  }

  private static getMockInfrastructureReport(): HealthReport {
    return {
      timestamp: new Date().toISOString(),
      overall_status: 'Healthy',
      total_checks: 3,
      healthy_count: 3,
      unhealthy_count: 0,
      degraded_count: 0,
      unknown_count: 0,
      checks: [
        {
          service_name: 'PostgreSQL',
          status: 'Healthy',
          response_time_ms: 125,
          details: 'Connected - PostgreSQL 15.3',
          timestamp: new Date().toISOString(),
        },
        {
          service_name: 'Redis',
          status: 'Healthy',
          response_time_ms: 18,
          details: 'PING successful',
          timestamp: new Date().toISOString(),
        },
        {
          service_name: 'etcd',
          status: 'Healthy',
          response_time_ms: 24,
          details: 'Key operations successful',
          timestamp: new Date().toISOString(),
        },
      ],
      summary: 'Health Check Summary: 3 healthy, 0 unhealthy, 0 degraded, 0 unknown out of 3 total services',
    };
  }

  private static getMockServicesReport(): HealthReport {
    return {
      timestamp: new Date().toISOString(),
      overall_status: 'Degraded',
      total_checks: 3,
      healthy_count: 2,
      unhealthy_count: 1,
      degraded_count: 0,
      unknown_count: 0,
      checks: [
        {
          service_name: 'Manager API',
          status: 'Unhealthy',
          response_time_ms: 5000,
          details: 'Connection refused - service may be down',
          timestamp: new Date().toISOString(),
          error_message: 'Connection refused',
        },
        {
          service_name: 'Prometheus',
          status: 'Healthy',
          response_time_ms: 8,
          details: 'Healthy endpoint accessible',
          timestamp: new Date().toISOString(),
        },
        {
          service_name: 'Grafana',
          status: 'Healthy',
          response_time_ms: 4,
          details: 'Database connection OK',
          timestamp: new Date().toISOString(),
        },
      ],
      summary: 'Health Check Summary: 2 healthy, 1 unhealthy, 0 degraded, 0 unknown out of 3 total services',
    };
  }

  private static getMockGpuDetails(): GpuInfo[] {
    return [
      {
        id: 0,
        name: 'NVIDIA GeForce RTX 4090',
        uuid: 'GPU-12345678-1234-1234-1234-123456789012',
        driver_version: '535.183.01',
        cuda_version: '12.2',
        memory_total: 25165824000, // 24GB in bytes
        memory_used: 3221225472,   // 3GB in bytes
        memory_free: 21944598528,  // 21GB in bytes
        utilization_gpu: 45,
        utilization_memory: 18,
        temperature: 65,
        power_usage: 180.5,
        power_limit: 450.0,
        fan_speed: 1200,
        processes: [
          {
            pid: 1234,
            name: 'python',
            memory_used: 2147483648, // 2GB in bytes
          },
          {
            pid: 5678,
            name: 'backend.ai-agent',
            memory_used: 1073741824, // 1GB in bytes
          },
        ],
      },
    ];
  }
}

export default api;