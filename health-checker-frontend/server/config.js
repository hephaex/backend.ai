const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
require('dotenv').config();

class ConfigManager {
  constructor() {
    this.hosts = [];
    this.config = this.loadConfig();
    this.loadHosts();
  }

  loadConfig() {
    return {
      healthCheckerPath: process.env.HEALTH_CHECKER_PATH || 
        path.join(__dirname, '../../health-checker/target/release/backend-ai-health-checker'),
      port: process.env.PORT || 8095,
      healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30,
      detailedCheckInterval: parseInt(process.env.DETAILED_CHECK_INTERVAL) || 60,
      enableGpuMonitoring: process.env.ENABLE_GPU_MONITORING === 'true',
      enableDockerMonitoring: process.env.ENABLE_DOCKER_MONITORING === 'true',
      enableInfrastructureMonitoring: process.env.ENABLE_INFRASTRUCTURE_MONITORING === 'true',
      enableServicesMonitoring: process.env.ENABLE_SERVICES_MONITORING === 'true',
      logLevel: process.env.LOG_LEVEL || 'info',
      enableDebug: process.env.ENABLE_DEBUG === 'true',
      apiUsername: process.env.API_USERNAME,
      apiPassword: process.env.API_PASSWORD,
      apiToken: process.env.API_TOKEN,
    };
  }

  async loadHosts() {
    // First try to load from MONITOR_HOSTS env var
    if (process.env.MONITOR_HOSTS) {
      const hostStrings = process.env.MONITOR_HOSTS.split(',');
      this.hosts = hostStrings.map((hostString, index) => {
        const [host, port = '8095'] = hostString.trim().split(':');
        return {
          id: `env-${index}`,
          name: host,
          host: host,
          port: parseInt(port),
          type: 'env',
          enabled: true,
          description: `Host from environment variable`,
        };
      });
      console.log(`Loaded ${this.hosts.length} hosts from environment variables`);
      return;
    }

    // Try to load from hosts.csv file
    const csvPath = path.join(__dirname, '../hosts.csv');
    if (fs.existsSync(csvPath)) {
      try {
        this.hosts = await this.loadHostsFromCSV(csvPath);
        console.log(`Loaded ${this.hosts.length} hosts from hosts.csv`);
      } catch (error) {
        console.error('Error loading hosts from CSV:', error);
        this.loadDefaultHosts();
      }
    } else {
      console.log('No hosts.csv found, using default localhost configuration');
      this.loadDefaultHosts();
    }
  }

  loadHostsFromCSV(csvPath) {
    return new Promise((resolve, reject) => {
      const hosts = [];
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => {
          hosts.push({
            id: row.name || `host-${hosts.length}`,
            name: row.name,
            host: row.host,
            port: parseInt(row.port) || 8095,
            type: row.type || 'unknown',
            enabled: row.enabled === 'true',
            description: row.description || '',
          });
        })
        .on('end', () => {
          resolve(hosts.filter(host => host.enabled));
        })
        .on('error', reject);
    });
  }

  loadDefaultHosts() {
    this.hosts = [
      {
        id: 'localhost',
        name: 'localhost',
        host: 'localhost',
        port: 8095,
        type: 'local',
        enabled: true,
        description: 'Local development environment',
      }
    ];
  }

  getEnabledHosts() {
    return this.hosts.filter(host => host.enabled);
  }

  getHostById(id) {
    return this.hosts.find(host => host.id === id);
  }

  getHostsByType(type) {
    return this.hosts.filter(host => host.type === type && host.enabled);
  }

  getAllHosts() {
    return this.hosts;
  }

  getConfig() {
    return this.config;
  }

  // Add a new host dynamically
  addHost(hostConfig) {
    const newHost = {
      id: hostConfig.id || `dynamic-${Date.now()}`,
      name: hostConfig.name,
      host: hostConfig.host,
      port: hostConfig.port || 8095,
      type: hostConfig.type || 'dynamic',
      enabled: hostConfig.enabled !== false,
      description: hostConfig.description || '',
    };
    this.hosts.push(newHost);
    return newHost;
  }

  // Remove a host
  removeHost(id) {
    const index = this.hosts.findIndex(host => host.id === id);
    if (index !== -1) {
      return this.hosts.splice(index, 1)[0];
    }
    return null;
  }

  // Update host configuration
  updateHost(id, updates) {
    const host = this.getHostById(id);
    if (host) {
      Object.assign(host, updates);
      return host;
    }
    return null;
  }
}

module.exports = new ConfigManager();