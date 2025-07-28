# Backend.AI Logging Guide

**Date**: 2025-07-28  
**Environment**: macOS with OrbStack  
**Purpose**: Comprehensive guide for acquiring logs from all Backend.AI system components

## Overview

This document provides detailed instructions for collecting logs from all Backend.AI system components, including manager, agent, infrastructure services (etcd, Redis, PostgreSQL), Docker containers, and error scenarios.

## Quick Reference Commands

```bash
# Manager service logs
./backend.ai mgr --log-level=DEBUG start-server 2>&1 | tee manager_startup.log

# Agent service logs  
./backend.ai ag --log-level=DEBUG start-server 2>&1 | tee agent_startup.log

# Container logs
docker logs backend.ai-halfstack-postgres-1
docker logs backend.ai-halfstack-redis-1
docker logs backend.ai-halfstack-etcd-1

# All container logs
docker compose -f docker-compose.halfstack.yml logs -f

# Network inspection
docker network ls
docker network inspect backend.ai-halfstack_half

# System-wide container status
docker ps -a
```

## 1. Manager Service Logging

### 1.1 Interactive Debug Logging

Start manager with maximum verbosity and real-time log output:

```bash
cd /Users/mare/Simon/backend.ai
./backend.ai mgr --log-level=DEBUG start-server 2>&1 | tee manager_startup.log
```

**Log Output Includes**:
- Configuration loading and validation
- Database connection establishment
- Redis/etcd service discovery
- Module initialization (web server, GraphQL, scheduler)
- API endpoint registration
- Error traces and stack dumps

### 1.2 Production Mode Logging

For production deployments without debug overhead:

```bash
./backend.ai mgr --log-level=INFO start-server > manager.log 2>&1 &
```

### 1.3 Manager Service Shutdown Logs

Capture graceful shutdown sequence:

```bash
# Start manager and capture PID
./backend.ai mgr start-server 2>&1 | tee manager_runtime.log &
MANAGER_PID=$!

# Later, stop and capture shutdown logs
kill -TERM $MANAGER_PID
# Logs will show cleanup of ValkeyClients, session schedulers, etc.
```

**Example Shutdown Log Pattern**:
```
[INFO] Shutting down the manager service...
[DEBUG] Closing ValkeyStandaloneClient connection pool
[DEBUG] Cleaning up session scheduler tasks
[INFO] Manager service stopped gracefully
```

## 2. Agent Service Logging

### 2.1 Agent Startup Logging

```bash
./backend.ai ag --log-level=DEBUG start-server 2>&1 | tee agent_startup.log
```

### 2.2 Agent with Container Runtime Logs

Monitor agent with kernel execution logging:

```bash
./backend.ai ag --log-level=DEBUG --debug-kernel start-server 2>&1 | tee agent_detailed.log
```

### 2.3 Agent Resource Monitoring

```bash
# Agent with resource statistics
./backend.ai ag --log-level=INFO --stats-monitor start-server 2>&1 | tee agent_stats.log
```

## 3. Infrastructure Service Logging

### 3.1 PostgreSQL Database Logs

```bash
# Container logs
docker logs backend.ai-halfstack-postgres-1 2>&1 | tee postgres.log

# Follow live logs
docker logs -f backend.ai-halfstack-postgres-1

# SQL query logging (if enabled)
docker exec backend.ai-halfstack-postgres-1 tail -f /var/log/postgresql/postgresql-*.log
```

**Database Connection Verification**:
```bash
# Test connection and log results
docker exec -it backend.ai-halfstack-postgres-1 psql -U postgres -d backend -c "\dt" 2>&1 | tee db_schema.log
```

### 3.2 Redis Service Logs

```bash
# Redis container logs
docker logs backend.ai-halfstack-redis-1 2>&1 | tee redis.log

# Redis command monitoring
docker exec backend.ai-halfstack-redis-1 redis-cli MONITOR 2>&1 | tee redis_commands.log

# Redis connection test with logging
docker exec backend.ai-halfstack-redis-1 redis-cli PING 2>&1 | tee redis_health.log
```

### 3.3 etcd Service Logs

```bash
# etcd container logs
docker logs backend.ai-halfstack-etcd-1 2>&1 | tee etcd.log

# etcd health check with logging
docker exec backend.ai-halfstack-etcd-1 etcdctl endpoint health 2>&1 | tee etcd_health.log

# etcd configuration dump
docker exec backend.ai-halfstack-etcd-1 etcdctl get --prefix "" 2>&1 | tee etcd_config.log
```

## 4. Docker Container & Network Logging

### 4.1 All Container Status and Logs

```bash
# Container health overview
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" > containers_status.log

# All halfstack services logs
docker compose -f docker-compose.halfstack.yml logs --timestamps 2>&1 | tee all_containers.log

# Follow all container logs in real-time
docker compose -f docker-compose.halfstack.yml logs -f --timestamps
```

### 4.2 Individual Container Detailed Logs

```bash
# Monitoring stack logs
docker logs backend.ai-halfstack-prometheus-1 2>&1 | tee prometheus.log
docker logs backend.ai-halfstack-grafana-1 2>&1 | tee grafana.log
docker logs backend.ai-halfstack-loki-1 2>&1 | tee loki.log
docker logs backend.ai-halfstack-tempo-1 2>&1 | tee tempo.log

# Observability components
docker logs backend.ai-halfstack-node-exporter-1 2>&1 | tee node_exporter.log
docker logs backend.ai-halfstack-otel-collector-1 2>&1 | tee otel_collector.log
```

### 4.3 Docker Network Analysis

```bash
# Network inspection
docker network ls > networks.log
docker network inspect backend.ai-halfstack_half > network_config.log

# Container network connectivity
docker exec backend.ai-halfstack-postgres-1 netstat -tuln > postgres_ports.log
docker exec backend.ai-halfstack-redis-1 netstat -tuln > redis_ports.log
docker exec backend.ai-halfstack-etcd-1 netstat -tuln > etcd_ports.log
```

## 5. Error Scenario Logging

### 5.1 Manager Service Stop Error Logging

**Scenario**: Force-stopping manager service and capturing error logs

```bash
# Start manager in background
./backend.ai mgr --log-level=DEBUG start-server > manager_error_test.log 2>&1 &
MANAGER_PID=$!

# Force stop and capture errors
kill -KILL $MANAGER_PID

# Check for error patterns in logs
grep -i "error\|exception\|traceback" manager_error_test.log > manager_errors.log
```

### 5.2 Database Connection Error Logging

```bash
# Stop database and test manager startup
docker stop backend.ai-halfstack-postgres-1
./backend.ai mgr start-server 2>&1 | tee db_connection_error.log

# Restart database
docker start backend.ai-halfstack-postgres-1
```

### 5.3 Redis Connection Error Logging

```bash
# Stop Redis and test manager startup
docker stop backend.ai-halfstack-redis-1
./backend.ai mgr start-server 2>&1 | tee redis_connection_error.log

# Restart Redis
docker start backend.ai-halfstack-redis-1
```

### 5.4 Port Conflict Error Logging

```bash
# Simulate port conflict
nc -l 8081 &  # Block manager API port
./backend.ai mgr start-server 2>&1 | tee port_conflict_error.log
kill %1  # Stop nc
```

## 6. Centralized Logging Collection

### 6.1 Complete System Log Collection Script

Create a comprehensive log collection script:

```bash
#!/bin/bash
# save as collect_all_logs.sh

LOG_DIR="logs_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$LOG_DIR"

echo "Collecting Backend.AI system logs to $LOG_DIR/"

# System information
docker --version > "$LOG_DIR/system_info.log"
docker compose version >> "$LOG_DIR/system_info.log"
uname -a >> "$LOG_DIR/system_info.log"

# Container status
docker ps -a > "$LOG_DIR/containers_status.log"
docker images > "$LOG_DIR/images.log"

# Network information
docker network ls > "$LOG_DIR/networks.log"
docker network inspect backend.ai-halfstack_half > "$LOG_DIR/network_config.log"

# All container logs
docker compose -f docker-compose.halfstack.yml logs --timestamps > "$LOG_DIR/all_containers.log"

# Individual service logs
docker logs backend.ai-halfstack-postgres-1 > "$LOG_DIR/postgres.log" 2>&1
docker logs backend.ai-halfstack-redis-1 > "$LOG_DIR/redis.log" 2>&1
docker logs backend.ai-halfstack-etcd-1 > "$LOG_DIR/etcd.log" 2>&1
docker logs backend.ai-halfstack-prometheus-1 > "$LOG_DIR/prometheus.log" 2>&1
docker logs backend.ai-halfstack-grafana-1 > "$LOG_DIR/grafana.log" 2>&1

# Configuration files
cp manager.toml "$LOG_DIR/manager.toml" 2>/dev/null
cp agent.toml "$LOG_DIR/agent.toml" 2>/dev/null
cp env-local-admin-api.sh "$LOG_DIR/env-local-admin-api.sh" 2>/dev/null

echo "Log collection completed in $LOG_DIR/"
```

### 6.2 Real-time Multi-Service Log Monitoring

Monitor all services simultaneously:

```bash
# Terminal multiplexing for multi-service monitoring
tmux new-session -d -s backend_logs \; \
  split-window -h \; \
  split-window -v \; \
  select-pane -t 0 \; \
  split-window -v \; \
  select-pane -t 0 \; \
  send-keys 'docker logs -f backend.ai-halfstack-postgres-1' Enter \; \
  select-pane -t 1 \; \
  send-keys 'docker logs -f backend.ai-halfstack-redis-1' Enter \; \
  select-pane -t 2 \; \
  send-keys 'docker logs -f backend.ai-halfstack-etcd-1' Enter \; \
  select-pane -t 3 \; \
  send-keys './backend.ai mgr --log-level=DEBUG start-server' Enter \; \
  attach-session
```

## 7. Log Analysis and Troubleshooting

### 7.1 Error Pattern Detection

```bash
# Common error patterns
grep -E "(ERROR|CRITICAL|Exception|Traceback)" *.log > critical_errors.log
grep -E "(Connection.*failed|timeout|refused)" *.log > connection_errors.log
grep -E "(Port.*busy|Address.*in use)" *.log > port_errors.log
```

### 7.2 Performance Analysis from Logs

```bash
# Startup timing analysis
grep -E "(Starting|Started|Initialized)" manager_startup.log | \
  sed 's/.*\[\([0-9-]\+[ ][0-9:]\+\)\].*/\1/' > startup_timeline.log

# Database query performance
grep -E "Query took [0-9]+\.[0-9]+s" *.log > slow_queries.log
```

### 7.3 Service Health Monitoring

```bash
# Create health check log
echo "=== Backend.AI Health Check $(date) ===" > health_check.log
docker ps --format "{{.Names}}: {{.Status}}" >> health_check.log
echo "" >> health_check.log

# Test service endpoints
curl -s http://127.0.0.1:8081/server/version >> health_check.log 2>&1 || echo "Manager API: FAILED" >> health_check.log
docker exec backend.ai-halfstack-redis-1 redis-cli ping >> health_check.log 2>&1 || echo "Redis: FAILED" >> health_check.log
docker exec backend.ai-halfstack-etcd-1 etcdctl endpoint health >> health_check.log 2>&1 || echo "etcd: FAILED" >> health_check.log
```

## 8. Log Rotation and Maintenance

### 8.1 Log File Management

```bash
# Archive old logs
find . -name "*.log" -mtime +7 -exec gzip {} \;

# Clean up large log files
find . -name "*.log" -size +100M -exec truncate -s 50M {} \;

# Organize logs by date
mkdir -p logs/$(date +%Y-%m-%d)
mv *.log logs/$(date +%Y-%m-%d)/
```

### 8.2 Docker Log Configuration

Add to docker-compose.halfstack.yml for log rotation:

```yaml
services:
  postgres:
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "3"
```

## 9. Integration with Monitoring Stack

### 9.1 Prometheus Metrics Logging

```bash
# Prometheus targets and metrics
curl -s http://127.0.0.1:9090/api/v1/targets > prometheus_targets.log
curl -s http://127.0.0.1:9090/api/v1/label/__name__/values > prometheus_metrics.log
```

### 9.2 Grafana Dashboard Export

```bash
# Export Grafana dashboards
curl -s -H "Authorization: Bearer your-api-key" \
  http://127.0.0.1:3000/api/dashboards/home > grafana_dashboards.log
```

## 10. Common Log Locations

### 10.1 File System Locations

```
~/.cache/bai/bootstrap/cpython/3.13.3/         # Static Python logs
/Users/mare/tmp/backend.ai/ipc/                # IPC socket logs
/tmp/backend.ai/                               # Temporary logs
./logs/                                        # Application logs (if configured)
```

### 10.2 Container Internal Logs

```bash
# Access container internal logs
docker exec backend.ai-halfstack-postgres-1 ls -la /var/log/postgresql/
docker exec backend.ai-halfstack-redis-1 ls -la /var/log/redis/
docker exec backend.ai-halfstack-etcd-1 ls -la /var/log/etcd/
```

## Troubleshooting Common Issues

### Issue 1: Manager Service Won't Start
```bash
# Diagnostic sequence
./backend.ai mgr --log-level=DEBUG start-server 2>&1 | tee debug.log
grep -E "(ERROR|Exception)" debug.log
```

### Issue 2: Database Connection Failed
```bash
# Check database connectivity
docker exec backend.ai-halfstack-postgres-1 pg_isready -U postgres
docker logs backend.ai-halfstack-postgres-1 | tail -20
```

### Issue 3: Container Communication Issues
```bash
# Network troubleshooting
docker network inspect backend.ai-halfstack_half | jq '.[]|.Containers'
docker exec backend.ai-halfstack-manager-1 nslookup postgres
```

## Summary

This logging guide provides comprehensive coverage for monitoring and troubleshooting Backend.AI deployments. Use the quick reference commands for immediate needs, and follow the detailed sections for in-depth analysis and debugging.

Key practices:
- Always use `--log-level=DEBUG` for troubleshooting
- Capture both stdout and stderr with `2>&1`
- Use `tee` to save logs while viewing real-time output
- Monitor multiple services simultaneously for integration issues
- Archive logs regularly for historical analysis

For additional support, refer to the Backend.AI documentation and community resources.