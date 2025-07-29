export type HealthStatus = 'Healthy' | 'Unhealthy' | 'Degraded' | 'Unknown';

export interface HealthCheckResult {
  service_name: string;
  status: HealthStatus;
  response_time_ms: number;
  details: string;
  timestamp: string;
  error_message?: string;
  host_id?: string;
  host_name?: string;
  host_type?: string;
}

export interface HostInfo {
  id: string;
  name: string;
  host: string;
  port: number;
  type: string;
  status: 'online' | 'offline';
}

export interface HealthReport {
  timestamp: string;
  overall_status: HealthStatus;
  total_checks: number;
  healthy_count: number;
  unhealthy_count: number;
  degraded_count: number;
  unknown_count: number;
  checks: HealthCheckResult[];
  summary: string;
  hosts?: HostInfo[];
  gpu_details?: GpuInfo[];
}

export interface GpuInfo {
  id: number;
  name: string;
  uuid?: string;
  driver_version: string;
  cuda_version?: string;
  memory_total: number;
  memory_used: number;
  memory_free: number;
  utilization_gpu: number;
  utilization_memory: number;
  temperature: number;
  power_usage: number;
  power_limit: number;
  fan_speed?: number;
  processes: GpuProcess[];
}

export interface GpuProcess {
  pid: number;
  name: string;
  memory_used: number;
}

export interface ServiceCategory {
  name: string;
  services: HealthCheckResult[];
  icon: string;
}

export interface DashboardStats {
  totalServices: number;
  healthyServices: number;
  unhealthyServices: number;
  degradedServices: number;
  unknownServices: number;
  averageResponseTime: number;
  uptime: string;
}