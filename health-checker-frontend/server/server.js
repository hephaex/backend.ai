const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const healthManager = require('./healthManager');
const logManager = require('./logManager');

const app = express();
const PORT = config.getConfig().port;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from React build (for production)
app.use(express.static(path.join(__dirname, '../build')));

// API Routes

// Get all health checks from all configured hosts
app.get('/api/health/all', async (req, res) => {
  try {
    console.log('Executing: all health checks across multiple hosts');
    const result = await healthManager.getAllHealthChecks();
    res.json(result);
  } catch (error) {
    console.error('Error executing all health checks:', error);
    res.status(500).json({ 
      error: 'Failed to execute health checks',
      message: error.message 
    });
  }
});

// Get Docker container health checks from all hosts
app.get('/api/health/docker', async (req, res) => {
  try {
    console.log('Executing: docker health checks across multiple hosts');
    const result = await healthManager.getCategoryHealthChecks('docker');
    res.json(result);
  } catch (error) {
    console.error('Error executing docker health checks:', error);
    res.status(500).json({ 
      error: 'Failed to execute docker health checks',
      message: error.message 
    });
  }
});

// Get GPU health checks from all GPU-enabled hosts
app.get('/api/health/gpu', async (req, res) => {
  try {
    console.log('Executing: GPU health checks across multiple hosts');
    const result = await healthManager.getCategoryHealthChecks('gpu');
    res.json(result);
  } catch (error) {
    console.error('Error executing GPU health checks:', error);
    res.status(500).json({ 
      error: 'Failed to execute GPU health checks',
      message: error.message 
    });
  }
});

// Get infrastructure health checks from all hosts
app.get('/api/health/infrastructure', async (req, res) => {
  try {
    console.log('Executing: infrastructure health checks across multiple hosts');
    const result = await healthManager.getCategoryHealthChecks('infrastructure');
    res.json(result);
  } catch (error) {
    console.error('Error executing infrastructure health checks:', error);
    res.status(500).json({ 
      error: 'Failed to execute infrastructure health checks',
      message: error.message 
    });
  }
});

// Get Backend.AI services health checks from all hosts
app.get('/api/health/services', async (req, res) => {
  try {
    console.log('Executing: services health checks across multiple hosts');
    const result = await healthManager.getCategoryHealthChecks('services');
    res.json(result);
  } catch (error) {
    console.error('Error executing services health checks:', error);
    res.status(500).json({ 
      error: 'Failed to execute services health checks',
      message: error.message 
    });
  }
});

// Get detailed GPU information from all GPU-enabled hosts
app.get('/api/gpu/details', async (req, res) => {
  try {
    console.log('Executing: detailed GPU information from all hosts');
    const result = await healthManager.getGpuDetails();
    res.json(result);
  } catch (error) {
    console.error('Error executing GPU details:', error);
    res.status(500).json({ 
      error: 'Failed to get GPU details',
      message: error.message 
    });
  }
});

// Host management endpoints

// Get all configured hosts
app.get('/api/hosts', (req, res) => {
  try {
    const hosts = config.getAllHosts();
    res.json({
      hosts: hosts,
      total: hosts.length,
      enabled: hosts.filter(h => h.enabled).length,
    });
  } catch (error) {
    console.error('Error getting hosts:', error);
    res.status(500).json({ 
      error: 'Failed to get hosts',
      message: error.message 
    });
  }
});

// Add a new host
app.post('/api/hosts', (req, res) => {
  try {
    const hostConfig = req.body;
    const newHost = config.addHost(hostConfig);
    
    // Clear cache to ensure fresh data for new host
    healthManager.clearCache();
    
    res.status(201).json(newHost);
  } catch (error) {
    console.error('Error adding host:', error);
    res.status(500).json({ 
      error: 'Failed to add host',
      message: error.message 
    });
  }
});

// Update a host configuration
app.put('/api/hosts/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updatedHost = config.updateHost(id, updates);
    
    if (updatedHost) {
      // Clear cache for this host
      healthManager.clearCache(id);
      res.json(updatedHost);
    } else {
      res.status(404).json({ error: 'Host not found' });
    }
  } catch (error) {
    console.error('Error updating host:', error);
    res.status(500).json({ 
      error: 'Failed to update host',
      message: error.message 
    });
  }
});

// Delete a host
app.delete('/api/hosts/:id', (req, res) => {
  try {
    const { id } = req.params;
    const removedHost = config.removeHost(id);
    
    if (removedHost) {
      // Clear cache for this host
      healthManager.clearCache(id);
      res.json({ message: 'Host removed successfully', host: removedHost });
    } else {
      res.status(404).json({ error: 'Host not found' });
    }
  } catch (error) {
    console.error('Error removing host:', error);
    res.status(500).json({ 
      error: 'Failed to remove host',
      message: error.message 
    });
  }
});

// Health check endpoint for the API itself
app.get('/api/health', (req, res) => {
  const hosts = config.getEnabledHosts();
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '0.2.0',
    configured_hosts: hosts.length,
    features: {
      multi_host_monitoring: true,
      gpu_monitoring: config.getConfig().enableGpuMonitoring,
      docker_monitoring: config.getConfig().enableDockerMonitoring,
      infrastructure_monitoring: config.getConfig().enableInfrastructureMonitoring,
      services_monitoring: config.getConfig().enableServicesMonitoring,
    }
  });
});

// Log management endpoints

// Get logs for a specific service
app.get('/api/logs/:service', async (req, res) => {
  try {
    const { service } = req.params;
    const { 
      lines = 100, 
      type = 'main', 
      source = 'auto' 
    } = req.query;

    console.log(`Getting logs for service: ${service}`);
    const logs = await logManager.getServiceLogs(service, {
      lines: parseInt(lines),
      type,
      source,
    });

    res.json(logs);
  } catch (error) {
    console.error('Error getting service logs:', error);
    res.status(500).json({
      error: 'Failed to get service logs',
      message: error.message,
    });
  }
});

// Get log statistics for a service
app.get('/api/logs/:service/stats', async (req, res) => {
  try {
    const { service } = req.params;
    console.log(`Getting log stats for service: ${service}`);
    const stats = await logManager.getLogStats(service);
    res.json(stats);
  } catch (error) {
    console.error('Error getting log stats:', error);
    res.status(500).json({
      error: 'Failed to get log stats',
      message: error.message,
    });
  }
});

// Search logs for a specific service
app.post('/api/logs/:service/search', async (req, res) => {
  try {
    const { service } = req.params;
    const { 
      query,
      lines = 1000,
      caseSensitive = false,
      regex = false,
    } = req.body;

    if (!query) {
      return res.status(400).json({
        error: 'Search query is required',
      });
    }

    console.log(`Searching logs for service: ${service}, query: ${query}`);
    const results = await logManager.searchLogs(service, query, {
      lines: parseInt(lines),
      caseSensitive,
      regex,
    });

    res.json(results);
  } catch (error) {
    console.error('Error searching logs:', error);
    res.status(500).json({
      error: 'Failed to search logs',
      message: error.message,
    });
  }
});

// Stream logs in real-time
app.get('/api/logs/:service/stream', (req, res) => {
  try {
    const { service } = req.params;
    const { 
      lines = 50, 
      source = 'auto' 
    } = req.query;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    console.log(`Starting log stream for service: ${service}`);
    
    const logProcess = logManager.streamServiceLogs(service, {
      lines: parseInt(lines),
      follow: true,
      source,
    });

    if (!logProcess) {
      res.write(`event: error\\ndata: ${JSON.stringify({ 
        error: `No log source available for service: ${service}` 
      })}\\n\\n`);
      res.end();
      return;
    }

    logProcess.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        res.write(`data: ${JSON.stringify({ 
          timestamp: new Date().toISOString(),
          service,
          message: line 
        })}\\n\\n`);
      });
    });

    logProcess.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        res.write(`data: ${JSON.stringify({ 
          timestamp: new Date().toISOString(),
          service,
          level: 'ERROR',
          message: line 
        })}\\n\\n`);
      });
    });

    logProcess.on('error', (error) => {
      res.write(`event: error\\ndata: ${JSON.stringify({ 
        error: error.message 
      })}\\n\\n`);
    });

    logProcess.on('close', () => {
      res.write(`event: close\\ndata: ${JSON.stringify({ 
        message: 'Log stream closed' 
      })}\\n\\n`);
      res.end();
    });

    // Clean up on client disconnect
    req.on('close', () => {
      if (logProcess && !logProcess.killed) {
        logProcess.kill();
      }
    });

  } catch (error) {
    console.error('Error starting log stream:', error);
    res.status(500).json({
      error: 'Failed to start log stream',
      message: error.message,
    });
  }
});

// Get available log services
app.get('/api/logs', (req, res) => {
  const services = [
    { 
      name: 'etcd', 
      displayName: 'ETCD',
      description: 'Distributed key-value store logs',
      types: ['main', 'error']
    },
    { 
      name: 'redis', 
      displayName: 'Redis',
      description: 'In-memory data structure store logs',
      types: ['main', 'error']
    },
    { 
      name: 'manager', 
      displayName: 'Backend.AI Manager',
      description: 'Backend.AI Manager service logs',
      types: ['main']
    },
    { 
      name: 'agent', 
      displayName: 'Backend.AI Agent',
      description: 'Backend.AI Agent service logs',
      types: ['main']
    },
  ];

  res.json({
    services,
    total: services.length,
  });
});

// Server-Sent Events endpoint for real-time multi-host updates
app.get('/api/health/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const sendHealthUpdate = async () => {
    try {
      const result = await healthManager.getAllHealthChecks();
      res.write(`data: ${JSON.stringify(result)}\\n\\n`);
    } catch (error) {
      console.error('Error in health stream:', error);
      res.write(`event: error\\ndata: ${JSON.stringify({ error: error.message })}\\n\\n`);
    }
  };

  // Send initial data
  sendHealthUpdate();

  // Send updates based on configured interval
  const interval = setInterval(sendHealthUpdate, config.getConfig().healthCheckInterval * 1000);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(interval);
  });
});

// Catch all handler for React Router (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

// Start server
app.listen(PORT, async () => {
  const hosts = config.getEnabledHosts();
  const appConfig = config.getConfig();
  
  console.log(`\n🚀 Backend.AI Multi-Host Health Checker API Server`);
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🔧 Health checker binary: ${appConfig.healthCheckerPath}`);
  console.log(`🌐 Monitoring ${hosts.length} hosts:`);
  
  hosts.forEach(host => {
    console.log(`   • ${host.name} (${host.host}:${host.port}) [${host.type}]`);
  });
  
  console.log(`\n📋 API Endpoints:`);
  console.log(`   GET  /api/health/all - Multi-host health checks`);
  console.log(`   GET  /api/health/docker - Docker container checks`);
  console.log(`   GET  /api/health/gpu - GPU hardware checks`);
  console.log(`   GET  /api/health/infrastructure - Infrastructure service checks`);
  console.log(`   GET  /api/health/services - Backend.AI service checks`);
  console.log(`   GET  /api/gpu/details - Detailed GPU information`);
  console.log(`   GET  /api/health/stream - Real-time health updates (SSE)`);
  console.log(`\n🔧 Host Management:`);
  console.log(`   GET    /api/hosts - List all hosts`);
  console.log(`   POST   /api/hosts - Add new host`);
  console.log(`   PUT    /api/hosts/:id - Update host`);
  console.log(`   DELETE /api/hosts/:id - Remove host`);
  
  console.log(`\n📜 Log Management:`);
  console.log(`   GET    /api/logs - List available log services`);
  console.log(`   GET    /api/logs/:service - Get service logs`);
  console.log(`   GET    /api/logs/:service/stats - Get log statistics`);
  console.log(`   POST   /api/logs/:service/search - Search logs`);
  console.log(`   GET    /api/logs/:service/stream - Stream logs (SSE)`);
  
  console.log(`\n⚙️  Configuration:`);
  console.log(`   Health check interval: ${appConfig.healthCheckInterval}s`);
  console.log(`   GPU monitoring: ${appConfig.enableGpuMonitoring ? '✅' : '❌'}`);
  console.log(`   Docker monitoring: ${appConfig.enableDockerMonitoring ? '✅' : '❌'}`);
  console.log(`   Infrastructure monitoring: ${appConfig.enableInfrastructureMonitoring ? '✅' : '❌'}`);
  console.log(`   Services monitoring: ${appConfig.enableServicesMonitoring ? '✅' : '❌'}`);
  console.log(`\n🔗 Dashboard: http://localhost:3010`);
});