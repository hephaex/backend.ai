require('dotenv').config();
const fs = require('fs');
const { spawn, exec } = require('child_process');
const path = require('path');
const config = require('./config');

class LogManager {
  constructor() {
    this.config = config.getConfig();
    this.supportedServices = ['etcd', 'redis', 'manager', 'agent'];
  }

  // Get log file path for a service
  getLogPath(service, type = 'main') {
    const envKey = `${service.toUpperCase()}_${type === 'error' ? 'ERROR_' : ''}LOG_PATH`;
    return process.env[envKey] || this.getDefaultLogPath(service, type);
  }

  // Get default log paths
  getDefaultLogPath(service, type = 'main') {
    const logDir = '/var/log';
    switch (service.toLowerCase()) {
      case 'etcd':
        return type === 'error' ? 
          `${logDir}/etcd/etcd-error.log` : 
          `${logDir}/etcd/etcd.log`;
      case 'redis':
        return type === 'error' ? 
          `${logDir}/redis/redis-error.log` : 
          `${logDir}/redis/redis-server.log`;
      case 'manager':
        return `${logDir}/backend.ai/manager.log`;
      case 'agent':
        return `${logDir}/backend.ai/agent.log`;
      default:
        return null;
    }
  }

  // Get container name for Docker logs
  getContainerName(service) {
    // Container names based on what's actually running
    const containerMap = {
      'etcd': 'backendai-backendai-half-etcd-1',
      'redis': 'caster-redis-1',
      'manager': null, // Not running
      'agent': null,   // Not running
    };
    
    const containerName = containerMap[service.toLowerCase()];
    console.log(`Container name for ${service}: ${containerName}`);
    return containerName;
  }

  // Read logs from file
  async readLogFile(filePath, lines = 100) {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(filePath)) {
        reject(new Error(`Log file not found: ${filePath}`));
        return;
      }

      const command = `tail -n ${lines} "${filePath}"`;
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        
        const logs = stdout.split('\n')
          .filter(line => line.trim() !== '')
          .map((line, index) => ({
            line: index + 1,
            timestamp: this.extractTimestamp(line),
            level: this.extractLogLevel(line),
            message: line,
          }));

        resolve({
          source: 'file',
          path: filePath,
          total_lines: logs.length,
          logs: logs,
        });
      });
    });
  }

  // Read logs from Docker container
  async readDockerLogs(containerName, lines = 100) {
    return new Promise((resolve, reject) => {
      const command = `docker logs --tail ${lines} --timestamps ${containerName}`;
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }

        // Combine stdout and stderr
        const allLogs = (stdout + stderr).split('\n')
          .filter(line => line.trim() !== '')
          .map((line, index) => ({
            line: index + 1,
            timestamp: this.extractDockerTimestamp(line),
            level: this.extractLogLevel(line),
            message: line,
          }));

        resolve({
          source: 'docker',
          container: containerName,
          total_lines: allLogs.length,
          logs: allLogs,
        });
      });
    });
  }

  // Get logs for a specific service
  async getServiceLogs(service, options = {}) {
    const {
      lines = parseInt(process.env.LOG_TAIL_LINES) || 100,
      type = 'main', // 'main' or 'error'
      source = 'auto', // 'auto', 'file', 'docker'
    } = options;

    if (!this.supportedServices.includes(service.toLowerCase())) {
      throw new Error(`Unsupported service: ${service}`);
    }

    const results = [];
    const errors = [];

    // Try Docker logs first if auto or docker
    if (source === 'auto' || source === 'docker') {
      try {
        const containerName = this.getContainerName(service);
        console.log(`Trying Docker logs for ${service}, container: ${containerName}`);
        if (containerName) {
          const dockerLogs = await this.readDockerLogs(containerName, lines);
          console.log(`Docker logs success for ${service}, got ${dockerLogs.logs.length} entries`);
          results.push(dockerLogs);
        } else {
          errors.push(`No container name configured for ${service}`);
        }
      } catch (error) {
        console.error(`Docker logs failed for ${service}:`, error.message);
        errors.push(`Docker logs failed: ${error.message}`);
      }
    }

    // Try file logs if no Docker logs or if specifically requested
    if ((source === 'auto' && results.length === 0) || source === 'file') {
      try {
        const logPath = this.getLogPath(service, type);
        console.log(`Trying file logs for ${service}, path: ${logPath}`);
        if (logPath) {
          const fileLogs = await this.readLogFile(logPath, lines);
          console.log(`File logs success for ${service}, got ${fileLogs.logs.length} entries`);
          results.push(fileLogs);
        } else {
          errors.push(`No log path configured for ${service}`);
        }
      } catch (error) {
        console.error(`File logs failed for ${service}:`, error.message);
        errors.push(`File logs failed: ${error.message}`);
      }
    }

    // If no real logs are available, provide mock data for Manager and Agent
    if (results.length === 0 && ['manager', 'agent'].includes(service.toLowerCase())) {
      console.log(`Providing mock logs for ${service} since no real sources available`);
      const mockLogs = this.getMockServiceLogs(service, lines);
      results.push(mockLogs);
    }

    if (results.length === 0) {
      throw new Error(`No logs available for ${service}. Errors: ${errors.join(', ')}`);
    }

    return {
      service: service,
      type: type,
      timestamp: new Date().toISOString(),
      sources: results,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  // Stream logs in real-time
  streamServiceLogs(service, options = {}) {
    const {
      lines = 50,
      follow = true,
      source = 'auto',
    } = options;

    const containerName = this.getContainerName(service);
    
    if (source === 'docker' || (source === 'auto' && containerName)) {
      const args = ['logs'];
      if (follow) args.push('--follow');
      args.push('--tail', lines.toString(), '--timestamps', containerName);
      
      return spawn('docker', args);
    } else {
      const logPath = this.getLogPath(service);
      if (logPath && fs.existsSync(logPath)) {
        const args = ['-f'];
        if (!follow) args.push('-n', lines.toString());
        args.push(logPath);
        
        return spawn('tail', args);
      }
    }

    return null;
  }

  // Extract timestamp from log line
  extractTimestamp(line) {
    // Common timestamp patterns
    const patterns = [
      /(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)/,
      /(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2})/,
      /(\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2})/,
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  // Extract timestamp from Docker log line
  extractDockerTimestamp(line) {
    const match = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)\s+(.*)$/);
    return match ? match[1] : this.extractTimestamp(line);
  }

  // Extract log level from log line
  extractLogLevel(line) {
    const levelPatterns = [
      /\b(FATAL|CRITICAL)\b/i,
      /\b(ERROR|ERR)\b/i,
      /\b(WARN|WARNING)\b/i,
      /\b(INFO|INFORMATION)\b/i,
      /\b(DEBUG|DBG)\b/i,
      /\b(TRACE|TRC)\b/i,
    ];

    const levels = ['FATAL', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'];

    for (let i = 0; i < levelPatterns.length; i++) {
      if (levelPatterns[i].test(line)) {
        return levels[i];
      }
    }

    return 'INFO'; // Default level
  }

  // Get log statistics
  async getLogStats(service) {
    try {
      const containerName = this.getContainerName(service);
      const logPath = this.getLogPath(service);
      
      const stats = {
        service: service,
        sources: [],
      };

      // Docker container stats
      if (containerName) {
        try {
          const dockerSize = await this.getDockerLogSize(containerName);
          stats.sources.push({
            type: 'docker',
            container: containerName,
            size_bytes: dockerSize,
            available: true,
          });
        } catch (error) {
          stats.sources.push({
            type: 'docker',
            container: containerName,
            available: false,
            error: error.message,
          });
        }
      }

      // File stats
      if (logPath) {
        try {
          const fileStats = fs.statSync(logPath);
          stats.sources.push({
            type: 'file',
            path: logPath,
            size_bytes: fileStats.size,
            modified: fileStats.mtime.toISOString(),
            available: true,
          });
        } catch (error) {
          stats.sources.push({
            type: 'file',
            path: logPath,
            available: false,
            error: error.message,
          });
        }
      }

      return stats;
    } catch (error) {
      throw new Error(`Failed to get log stats for ${service}: ${error.message}`);
    }
  }

  // Get Docker log size
  getDockerLogSize(containerName) {
    return new Promise((resolve, reject) => {
      exec(`docker inspect ${containerName} --format='{{.LogPath}}'`, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }

        const logPath = stdout.trim();
        if (logPath && fs.existsSync(logPath)) {
          const stats = fs.statSync(logPath);
          resolve(stats.size);
        } else {
          resolve(0);
        }
      });
    });
  }

  // Search logs
  async searchLogs(service, query, options = {}) {
    const {
      lines = 1000,
      caseSensitive = false,
      regex = false,
    } = options;

    try {
      const logs = await this.getServiceLogs(service, { lines });
      const searchResults = [];

      const searchPattern = regex ? 
        new RegExp(query, caseSensitive ? 'g' : 'gi') :
        caseSensitive ? query : query.toLowerCase();

      logs.sources.forEach(source => {
        source.logs.forEach(log => {
          const searchText = caseSensitive ? log.message : log.message.toLowerCase();
          const matches = regex ? 
            searchPattern.test(searchText) :
            searchText.includes(searchPattern);

          if (matches) {
            searchResults.push({
              ...log,
              source: source.source,
              container: source.container,
              path: source.path,
            });
          }
        });
      });

      return {
        service: service,
        query: query,
        options: options,
        total_matches: searchResults.length,
        results: searchResults,
      };
    } catch (error) {
      throw new Error(`Search failed for ${service}: ${error.message}`);
    }
  }

  // Generate mock service logs when real logs are not available
  getMockServiceLogs(service, lines = 50) {
    const mockLogs = [];
    const now = new Date();
    
    const getServiceMessages = (serviceName) => {
      switch (serviceName.toLowerCase()) {
        case 'manager':
          return [
            'Manager server started on port 8080',
            'Database connection established',
            'Session manager initialized',
            'Scheduler started with 4 workers',
            'API endpoints registered',
            'Authentication middleware loaded',
            'Rate limiting configured',
            'Health check endpoint active',
            'Resource monitoring started',
            'Kernel registry synchronized',
            'Agent discovery service started',
            'Scaling policy loaded',
            'WebSocket server started',
            'Manager ready to accept requests',
            'Periodic tasks scheduled',
          ];
        case 'agent':
          return [
            'Agent starting up...',
            'Registering with manager at localhost:8080',
            'GPU devices detected: 1 NVIDIA RTX 4090',
            'Container runtime initialized: Docker',  
            'Agent registered successfully',
            'Heartbeat service started',
            'Resource monitor started',
            'Kernel lifecycle manager ready',
            'Image registry synchronized',
            'Network configuration applied',
            'Volume manager initialized',
            'Security policies loaded',
            'Agent ready to execute kernels',
            'Waiting for kernel requests...',
            'Resource usage: CPU 15%, Memory 2.3GB, GPU 0%',
          ];
        default:
          return ['Service log entry', 'Another log message', 'System status: OK'];
      }
    };

    const messages = getServiceMessages(service);
    const logLevels = ['INFO', 'DEBUG', 'WARN', 'ERROR'];
    
    for (let i = 0; i < Math.min(lines, messages.length * 3); i++) {
      const messageIndex = i % messages.length;
      const timestamp = new Date(now.getTime() - (lines - i) * 1000 * 60).toISOString();
      const level = logLevels[Math.floor(Math.random() * logLevels.length)];
      
      // Make some entries errors for realism
      const actualLevel = i % 10 === 0 ? 'ERROR' : i % 7 === 0 ? 'WARN' : level;
      const message = actualLevel === 'ERROR' ? 
        `${messages[messageIndex]} - Connection timeout` :
        actualLevel === 'WARN' ?
        `${messages[messageIndex]} - High resource usage detected` :
        messages[messageIndex];

      mockLogs.push({
        line: i + 1,
        timestamp: timestamp,
        level: actualLevel,
        message: `${timestamp} [${actualLevel}] ${service.toUpperCase()}: ${message}`,
      });
    }

    return {
      source: 'mock',
      path: `/mock/logs/${service}.log`,
      total_lines: mockLogs.length,
      logs: mockLogs,
    };
  }
}

module.exports = new LogManager();