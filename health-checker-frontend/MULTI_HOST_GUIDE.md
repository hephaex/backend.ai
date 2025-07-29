# Multi-Host Monitoring Guide

Backend.AI Health Checker now supports monitoring multiple hosts simultaneously using either environment variables or CSV configuration files.

## Configuration Methods

### Method 1: Environment Variables (.env file)

Create a `.env` file in the root directory:

```bash
# Multi-host monitoring (comma-separated)
MONITOR_HOSTS=localhost:8095,192.168.1.100:8095,backend-ai-node-1:8095

# Health check intervals (in seconds)
HEALTH_CHECK_INTERVAL=30
DETAILED_CHECK_INTERVAL=60

# Monitoring settings
ENABLE_GPU_MONITORING=true
ENABLE_DOCKER_MONITORING=true
ENABLE_INFRASTRUCTURE_MONITORING=true
ENABLE_SERVICES_MONITORING=true

# Optional authentication for remote hosts
API_USERNAME=your_username
API_PASSWORD=your_password
API_TOKEN=your_bearer_token
```

### Method 2: CSV Configuration (hosts.csv)

Create a `hosts.csv` file in the root directory:

```csv
name,host,port,type,enabled,description
localhost,localhost,8095,local,true,Local development environment
backend-ai-manager,192.168.1.100,8095,manager,true,Backend.AI Manager Node
backend-ai-agent-1,192.168.1.101,8095,agent,true,Backend.AI Agent Node 1
backend-ai-agent-2,192.168.1.102,8095,agent,true,Backend.AI Agent Node 2
backend-ai-storage,192.168.1.103,8095,storage,true,Backend.AI Storage Proxy
gpu-node-1,192.168.1.105,8095,gpu,true,GPU-enabled compute node 1
gpu-node-2,192.168.1.106,8095,gpu,true,GPU-enabled compute node 2
```

**Column Descriptions:**
- `name`: Unique identifier for the host
- `host`: Hostname or IP address
- `port`: Port number (default: 8095)
- `type`: Host type (local, manager, agent, storage, web, gpu)
- `enabled`: true/false to enable/disable monitoring
- `description`: Human-readable description

## Host Types

- **local**: Local development environment
- **manager**: Backend.AI Manager nodes
- **agent**: Backend.AI Agent nodes  
- **storage**: Storage proxy nodes
- **web**: Web server nodes
- **gpu**: GPU-enabled compute nodes

## API Endpoints

### Health Check Endpoints
- `GET /api/health/all` - Multi-host health checks
- `GET /api/health/docker` - Docker container checks across hosts
- `GET /api/health/gpu` - GPU hardware checks from GPU hosts
- `GET /api/health/infrastructure` - Infrastructure services across hosts
- `GET /api/health/services` - Backend.AI services across hosts
- `GET /api/gpu/details` - Detailed GPU information from all GPU hosts

### Host Management Endpoints
- `GET /api/hosts` - List all configured hosts
- `POST /api/hosts` - Add new host dynamically
- `PUT /api/hosts/:id` - Update host configuration
- `DELETE /api/hosts/:id` - Remove host

### Real-time Updates
- `GET /api/health/stream` - Server-Sent Events for real-time updates

## Dynamic Host Management

### Add Host via API
```bash
curl -X POST http://localhost:8095/api/hosts \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "new-agent",
    "host": "192.168.1.200",
    "port": 8095,
    "type": "agent",
    "description": "Dynamically added agent node"
  }'
```

### Update Host
```bash
curl -X PUT http://localhost:8095/api/hosts/new-agent \\
  -H "Content-Type: application/json" \\
  -d '{
    "enabled": false,
    "description": "Temporarily disabled"
  }'
```

### Remove Host
```bash
curl -X DELETE http://localhost:8095/api/hosts/new-agent
```

## Web Dashboard Features

The web dashboard at `http://localhost:3010` now displays:

1. **Multi-Host Overview**: Visual grid showing all configured hosts with their status
2. **Host Status Indicators**: Online/offline status with connection information  
3. **Service Aggregation**: Combined health checks from all enabled hosts
4. **Host-Specific Service Names**: Services prefixed with host name for clarity
5. **Real-time Updates**: Automatic refresh every 30 seconds (configurable)

## Configuration Priority

1. **Environment Variables**: If `MONITOR_HOSTS` is set, it takes precedence
2. **hosts.csv**: Used if no environment variables are configured
3. **Default**: Falls back to localhost only

## Authentication

For secure remote monitoring, configure authentication in `.env`:

```bash
# Basic Authentication
API_USERNAME=monitor_user
API_PASSWORD=secure_password

# OR Bearer Token
API_TOKEN=your_jwt_token_here
```

## Troubleshooting

### Remote Host Connection Issues

1. **Timeout Errors**: Increase timeout in `healthManager.js` (default: 10s)
2. **Network Issues**: Verify hosts are reachable and health checker API is running
3. **Authentication**: Check credentials and ensure remote hosts support same auth method

### Configuration Issues

1. **CSV Parsing**: Ensure proper CSV format with header row
2. **Environment Variables**: Check `.env` syntax and restart server
3. **Host Conflicts**: Ensure unique host names/IDs

### Performance Optimization

1. **Cache Settings**: Adjust cache timeout in `healthManager.js` (default: 30s)
2. **Check Intervals**: Increase intervals for less frequent updates
3. **Selective Monitoring**: Disable unused monitoring types in configuration

## Example Multi-Host Setup

For a typical Backend.AI cluster:

```csv
name,host,port,type,enabled,description
manager-primary,192.168.1.10,8095,manager,true,Primary Manager Node
manager-secondary,192.168.1.11,8095,manager,true,Secondary Manager Node
agent-cpu-1,192.168.1.20,8095,agent,true,CPU Agent Node 1
agent-cpu-2,192.168.1.21,8095,agent,true,CPU Agent Node 2
agent-gpu-1,192.168.1.30,8095,gpu,true,GPU Agent Node 1 (RTX 4090)
agent-gpu-2,192.168.1.31,8095,gpu,true,GPU Agent Node 2 (RTX 4090)
storage-proxy,192.168.1.40,8095,storage,true,Storage Proxy
web-ui,192.168.1.50,8095,web,true,Web UI Server
```

This configuration enables comprehensive monitoring of an 8-node Backend.AI cluster with automatic failover detection and GPU resource monitoring.