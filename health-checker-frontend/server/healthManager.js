const { spawn } = require('child_process');
const axios = require('axios');
const config = require('./config');

class HealthCheckManager {
  constructor() {
    this.healthCheckerPath = config.getConfig().healthCheckerPath;
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30 seconds
  }

  // Execute health checker for local host
  executeLocalHealthChecker(args = []) {
    return new Promise((resolve, reject) => {
      const process = spawn(this.healthCheckerPath, [...args, '--format', 'json'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
            const jsonData = JSON.parse(stdout);
            resolve(jsonData);
          } catch (error) {
            console.error('Failed to parse JSON output:', error);
            reject(new Error('Invalid JSON response from health checker'));
          }
        } else {
          console.error('Health checker exited with code:', code);
          console.error('Stderr:', stderr);
          reject(new Error(`Health checker failed with exit code ${code}`));
        }
      });

      process.on('error', (error) => {
        console.error('Failed to start health checker process:', error);
        reject(error);
      });
    });
  }

  // Execute health check on remote host via HTTP API
  async executeRemoteHealthCheck(host, endpoint) {
    const url = `http://${host.host}:${host.port}${endpoint}`;
    const cacheKey = `${host.id}-${endpoint}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const axiosConfig = {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      // Add authentication if configured
      const globalConfig = config.getConfig();
      if (globalConfig.apiUsername && globalConfig.apiPassword) {
        axiosConfig.auth = {
          username: globalConfig.apiUsername,
          password: globalConfig.apiPassword,
        };
      } else if (globalConfig.apiToken) {
        axiosConfig.headers.Authorization = `Bearer ${globalConfig.apiToken}`;
      }

      const response = await axios.get(url, axiosConfig);
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now(),
      });

      return response.data;
    } catch (error) {
      console.error(`Remote health check failed for ${host.name}:`, error.message);
      
      // Return a failure report
      return {
        timestamp: new Date().toISOString(),
        overall_status: 'Unhealthy',
        total_checks: 1,
        healthy_count: 0,
        unhealthy_count: 1,
        degraded_count: 0,
        unknown_count: 0,
        checks: [{
          service_name: `${host.name} Connection`,
          status: 'Unhealthy',
          response_time_ms: 0,
          details: `Failed to connect to ${host.host}:${host.port} - ${error.message}`,
          timestamp: new Date().toISOString(),
          error_message: error.message,
        }],
        summary: `Failed to connect to host ${host.name}`,
      };
    }
  }

  // Get health checks from all configured hosts
  async getAllHealthChecks() {
    const hosts = config.getEnabledHosts();
    const results = await Promise.allSettled(
      hosts.map(async (host) => {
        if (host.type === 'local' || host.host === 'localhost') {
          return {
            host: host,
            data: await this.executeLocalHealthChecker(['all']),
          };
        } else {
          return {
            host: host,
            data: await this.executeRemoteHealthCheck(host, '/api/health/all'),
          };
        }
      })
    );

    return this.combineHealthResults(results, hosts);
  }

  // Get specific category health checks from all hosts
  async getCategoryHealthChecks(category) {
    const hosts = config.getEnabledHosts();
    const results = await Promise.allSettled(
      hosts.map(async (host) => {
        if (host.type === 'local' || host.host === 'localhost') {
          return {
            host: host,
            data: await this.executeLocalHealthChecker([category]),
          };
        } else {
          return {
            host: host,
            data: await this.executeRemoteHealthCheck(host, `/api/health/${category}`),
          };
        }
      })
    );

    return this.combineHealthResults(results, hosts);
  }

  // Combine health results from multiple hosts
  combineHealthResults(results, hosts) {
    const combinedChecks = [];
    let totalHealthy = 0;
    let totalUnhealthy = 0;
    let totalDegraded = 0;
    let totalUnknown = 0;
    let overallStatus = 'Healthy';

    results.forEach((result, index) => {
      const host = hosts[index];
      
      if (result.status === 'fulfilled') {
        const data = result.value.data;
        
        // Add host information to each check
        if (data.checks) {
          data.checks.forEach(check => {
            combinedChecks.push({
              ...check,
              host_id: host.id,
              host_name: host.name,
              host_type: host.type,
              service_name: `${host.name}: ${check.service_name}`,
            });
          });
        }

        // Aggregate counts
        totalHealthy += data.healthy_count || 0;
        totalUnhealthy += data.unhealthy_count || 0;
        totalDegraded += data.degraded_count || 0;
        totalUnknown += data.unknown_count || 0;

        // Update overall status
        if (data.overall_status === 'Unhealthy') {
          overallStatus = 'Unhealthy';
        } else if (data.overall_status === 'Degraded' && overallStatus !== 'Unhealthy') {
          overallStatus = 'Degraded';
        }
      } else {
        // Handle failed host connection
        combinedChecks.push({
          service_name: `${host.name}: Connection`,
          status: 'Unhealthy',
          response_time_ms: 0,
          details: `Failed to connect to ${host.host}:${host.port}`,
          timestamp: new Date().toISOString(),
          error_message: result.reason?.message || 'Connection failed',
          host_id: host.id,
          host_name: host.name,
          host_type: host.type,
        });
        totalUnhealthy += 1;
        overallStatus = 'Unhealthy';
      }
    });

    return {
      timestamp: new Date().toISOString(),
      overall_status: overallStatus,
      total_checks: combinedChecks.length,
      healthy_count: totalHealthy,
      unhealthy_count: totalUnhealthy,
      degraded_count: totalDegraded,
      unknown_count: totalUnknown,
      checks: combinedChecks,
      summary: `Multi-host health check: ${totalHealthy} healthy, ${totalUnhealthy} unhealthy, ${totalDegraded} degraded, ${totalUnknown} unknown out of ${combinedChecks.length} total services across ${hosts.length} hosts`,
      hosts: hosts.map(host => ({
        id: host.id,
        name: host.name,
        host: host.host,
        port: host.port,
        type: host.type,
        status: results.find((_, i) => hosts[i].id === host.id)?.status === 'fulfilled' ? 'online' : 'offline',
      })),
    };
  }

  // Get detailed GPU information from all GPU-enabled hosts
  async getGpuDetails() {
    const hosts = config.getEnabledHosts();
    const gpuHosts = hosts.filter(host => 
      host.type === 'gpu' || host.type === 'local' || host.name.includes('gpu')
    );

    const results = await Promise.allSettled(
      gpuHosts.map(async (host) => {
        if (host.type === 'local' || host.host === 'localhost') {
          // For local, return mock data as implemented in original server
          return {
            host: host,
            data: this.getMockGpuDetails(host),
          };
        } else {
          return {
            host: host,
            data: await this.executeRemoteHealthCheck(host, '/api/gpu/details'),
          };
        }
      })
    );

    const combinedGpuData = [];
    results.forEach((result, index) => {
      const host = gpuHosts[index];
      if (result.status === 'fulfilled' && result.value.data) {
        const gpuData = Array.isArray(result.value.data) ? result.value.data : [result.value.data];
        gpuData.forEach(gpu => {
          combinedGpuData.push({
            ...gpu,
            host_id: host.id,
            host_name: host.name,
            id: `${host.id}-gpu-${gpu.id || 0}`,
          });
        });
      }
    });

    return combinedGpuData;
  }

  getMockGpuDetails(host) {
    return [{
      id: 0,
      name: 'NVIDIA GeForce RTX 4090',
      uuid: `GPU-${host.id}-1234-1234-1234-123456789012`,
      driver_version: '535.183.01',
      cuda_version: '12.2',
      memory_total: 25165824000,
      memory_used: 3221225472,
      memory_free: 21944598528,
      utilization_gpu: Math.floor(Math.random() * 100),
      utilization_memory: Math.floor(Math.random() * 50),
      temperature: 65 + Math.floor(Math.random() * 20),
      power_usage: 180.5 + Math.random() * 100,
      power_limit: 450.0,
      fan_speed: 1200 + Math.floor(Math.random() * 500),
      processes: [
        {
          pid: 1234,
          name: 'python',
          memory_used: 2147483648,
        },
        {
          pid: 5678,
          name: 'backend.ai-agent',
          memory_used: 1073741824,
        },
      ],
    }];
  }

  // Clear cache for a specific host or all hosts
  clearCache(hostId = null) {
    if (hostId) {
      for (const [key] of this.cache) {
        if (key.startsWith(`${hostId}-`)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
}

module.exports = new HealthCheckManager();