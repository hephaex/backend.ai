# Backend.AI Health Checker

A comprehensive health monitoring application for Backend.AI infrastructure components, written in Rust.

## Features

- **Comprehensive Health Checks**: Monitor all Backend.AI services including manager, agent, PostgreSQL, Redis, etcd, Prometheus, and Grafana
- **Docker Container Monitoring**: Real-time status checking of all Backend.AI containers
- **Multiple Output Formats**: Table, JSON, and summary formats for different use cases
- **Continuous Monitoring**: Built-in monitoring mode with configurable intervals
- **System Resource Checking**: Monitor Docker daemon, system resources, network connectivity, and port usage
- **Fast and Reliable**: Built with Rust for performance and reliability

## Installation

### Prerequisites

- Rust 1.70+ (for building from source)
- Docker and Docker Compose (for Backend.AI infrastructure)
- Backend.AI halfstack deployment running

### Building from Source

```bash
cd health-checker
cargo build --release
```

The binary will be available at `target/release/backend-ai-health-checker`.

## Usage

### Basic Commands

```bash
# Run all health checks with table output (includes GPU)
./backend-ai-health-checker all

# Run all health checks with JSON output
./backend-ai-health-checker all --format json

# Check only Docker containers
./backend-ai-health-checker docker

# Check only Backend.AI services (Manager API, Prometheus, Grafana)
./backend-ai-health-checker services

# Check only infrastructure services (PostgreSQL, Redis, etcd)
./backend-ai-health-checker infrastructure

# Check only GPU hardware
./backend-ai-health-checker gpu

# Check GPU with detailed information
./backend-ai-health-checker gpu --detailed

# Monitor continuously every 30 seconds (includes GPU)
./backend-ai-health-checker monitor --interval 30

# Monitor with maximum 10 checks
./backend-ai-health-checker monitor --interval 60 --max-checks 10
```

### Command Line Options

#### `all` - Run All Health Checks
```bash
./backend-ai-health-checker all [OPTIONS]

Options:
  -f, --format <FORMAT>    Output format (table, json, summary) [default: table]
  -v, --verbose           Include detailed logs in output
  -t, --timeout <TIMEOUT> Timeout for each check in seconds [default: 30]
```

#### `docker` - Docker Container Checks
```bash
./backend-ai-health-checker docker [OPTIONS]

Options:
  -f, --format <FORMAT>   Output format (table, json, summary) [default: table]
```

#### `services` - Backend.AI Service Checks
```bash
./backend-ai-health-checker services [OPTIONS]

Options:
  -f, --format <FORMAT>   Output format (table, json, summary) [default: table]
```

#### `infrastructure` - Infrastructure Service Checks
```bash
./backend-ai-health-checker infrastructure [OPTIONS]

Options:
  -f, --format <FORMAT>   Output format (table, json, summary) [default: table]
```

#### `gpu` - GPU Hardware Checks
```bash
./backend-ai-health-checker gpu [OPTIONS]

Options:
  -f, --format <FORMAT>   Output format (table, json, summary) [default: table]
  -d, --detailed          Show detailed GPU information including processes
```

#### `monitor` - Continuous Monitoring
```bash
./backend-ai-health-checker monitor [OPTIONS]

Options:
  -i, --interval <INTERVAL>     Check interval in seconds [default: 30]
  -m, --max-checks <MAX_CHECKS> Maximum number of checks (0 for infinite) [default: 0]
```

## Health Check Components

### Docker Containers
- **backend.ai-halfstack-postgres-1**: PostgreSQL database
- **backend.ai-halfstack-redis-1**: Redis cache
- **backend.ai-halfstack-etcd-1**: etcd service discovery
- **backend.ai-halfstack-prometheus-1**: Metrics collection
- **backend.ai-halfstack-grafana-1**: Metrics visualization
- **backend.ai-halfstack-loki-1**: Log aggregation
- **backend.ai-halfstack-tempo-1**: Distributed tracing
- **backend.ai-halfstack-pyroscope-1**: Continuous profiling
- **backend.ai-halfstack-node-exporter-1**: System metrics
- **backend.ai-halfstack-otel-collector-1**: OpenTelemetry collector

### Infrastructure Services
- **PostgreSQL** (port 8101): Database connectivity and query testing
- **Redis** (port 8111): Cache connectivity and PING test
- **etcd** (port 8121): Service discovery health check

### Backend.AI Services
- **Manager API** (port 8081): API endpoint accessibility
- **Prometheus** (port 9090): Metrics system health
- **Grafana** (port 3000): Dashboard system health

### GPU Hardware (NEW)
- **NVIDIA GPUs**: Full monitoring via NVML or nvidia-smi fallback
  - GPU utilization and memory usage
  - Temperature and power consumption  
  - Running processes and memory allocation
  - Driver and CUDA version information
- **Apple Silicon GPUs**: macOS Metal GPU monitoring
  - GPU utilization and memory pressure
  - Temperature monitoring
  - Power usage tracking

### System Checks
- **Docker Daemon**: Docker service availability
- **System Resources**: Memory and disk usage
- **Network Connectivity**: Port accessibility testing
- **Configuration Files**: Required config file presence
- **Port Usage**: Service port binding status

## Output Formats

### Table Format (Default)
```
Backend.AI Health Check Report
Timestamp: 2025-07-28 10:30:00 UTC
Overall Status: ✓ Healthy

┌─────────────────────────────────────┬─────────────┬───────────────┬──────────────────────────────────┐
│ Service                             │ Status      │ Response Time │ Details                          │
├─────────────────────────────────────┼─────────────┼───────────────┼──────────────────────────────────┤
│ backend.ai-halfstack-postgres-1     │ ✓ Healthy   │ 45ms          │ Running since 2025-07-28T08:00  │
│ backend.ai-halfstack-redis-1        │ ✓ Healthy   │ 32ms          │ Running since 2025-07-28T08:00  │
│ PostgreSQL                          │ ✓ Healthy   │ 125ms         │ Connected - PostgreSQL 15.3     │
│ Redis                               │ ✓ Healthy   │ 18ms          │ PING successful                  │
│ Manager API                         │ ✗ Unhealthy │ 5000ms        │ Connection refused               │
│ NVIDIA GPU 0                        │ ✓ Healthy   │ 156ms         │ RTX 4090 - GPU: 45%, Mem: 12.5% │
└─────────────────────────────────────┴─────────────┴───────────────┴──────────────────────────────────┘

Health Check Summary: 9 healthy, 1 unhealthy, 0 degraded, 0 unknown out of 10 total services
```

### JSON Format
```json
{
  "timestamp": "2025-07-28T10:30:00Z",
  "overall_status": "Degraded",
  "total_checks": 9,
  "healthy_count": 8,
  "unhealthy_count": 1,
  "degraded_count": 0,
  "unknown_count": 0,
  "checks": [
    {
      "service_name": "PostgreSQL",
      "status": "Healthy",
      "response_time_ms": 125,
      "details": "Connected - PostgreSQL 15.3",
      "timestamp": "2025-07-28T10:30:00Z",
      "error_message": null
    }
  ],
  "summary": "Health Check Summary: 8 healthy, 1 unhealthy, 0 degraded, 0 unknown out of 9 total services"
}
```

### Summary Format
```
Backend.AI Health Status - 10:30:00
backend.ai-halfstack-postgres-1: ✓ Healthy (45ms)
backend.ai-halfstack-redis-1: ✓ Healthy (32ms)
PostgreSQL: ✓ Healthy (125ms)
Redis: ✓ Healthy (18ms)
Manager API: ✗ Unhealthy (5000ms)
NVIDIA GPU 0: ✓ Healthy (156ms)
Health Check Summary: 9 healthy, 1 unhealthy, 0 degraded, 0 unknown out of 10 total services
```

## Health Status Definitions

- **✓ Healthy**: Service is fully operational and responding correctly
- **⚠ Degraded**: Service is responding but with issues (slow response, partial functionality)
- **✗ Unhealthy**: Service is not responding or returning errors
- **? Unknown**: Service status could not be determined

## Integration with Backend.AI Logging

This health checker complements the Backend.AI logging system documented in `LOGGING_GUIDE.md`:

- Use health checks to identify issues before they appear in logs
- Monitor service recovery after applying log-based troubleshooting
- Combine with log analysis for comprehensive system monitoring

## Monitoring Best Practices

1. **Regular Health Checks**: Run comprehensive checks before and after system changes
2. **Continuous Monitoring**: Use monitor mode during development and testing
3. **Alert Integration**: Parse JSON output for integration with alerting systems
4. **Performance Tracking**: Monitor response times to identify performance degradation
5. **Trend Analysis**: Store health check results for historical analysis

## GPU Monitoring Features

Based on the [all-smi](https://github.com/inureyes/all-smi) repository, our GPU monitoring provides:

### Supported GPU Platforms
- **NVIDIA GPUs**: Full NVML integration with fallback to nvidia-smi
- **Apple Silicon GPUs**: Native Metal integration on macOS
- **Cross-platform compatibility**: Automatic detection and adaptation

### GPU Health Metrics
- **Performance**: GPU/Memory utilization percentages
- **Thermal**: Temperature monitoring with threshold alerts
- **Power**: Power usage vs. limits with efficiency tracking
- **Memory**: Detailed memory allocation and usage
- **Processes**: Running GPU processes with memory consumption

### GPU-Specific Commands

```bash
# Basic GPU monitoring (similar to nvidia-smi)
./backend-ai-health-checker gpu

# Detailed view with processes (similar to all-smi view)
./backend-ai-health-checker gpu --detailed

# JSON output for programmatic access
./backend-ai-health-checker gpu --format json

# Continuous GPU monitoring
./backend-ai-health-checker monitor --interval 10
```

### Example Detailed GPU Output
```
GPU Summary: NVIDIA GPUs available

GPU 0: NVIDIA GeForce RTX 4090
  Driver: 535.183.01
  CUDA: 12.2
  Memory: 3072/24564 MB (12.5%)
  Utilization: GPU 45%, Memory 18%
  Temperature: 65°C
  Power: 180.5W / 450.0W
  Processes:
    PID 1234: python (2048MB)
    PID 5678: backend.ai-agent (1024MB)
```

## Troubleshooting

### Common Issues

#### "Docker daemon not accessible"
- Ensure Docker is running: `docker version`
- Check Docker permissions for current user

#### "Connection refused" for services
- Verify containers are running: `docker ps`
- Check port bindings match expected ports (8081, 8101, 8111, 8121, etc.)
- Review Backend.AI configuration files

#### "PostgreSQL connection failed"
- Check if postgres container is healthy: `docker logs backend.ai-halfstack-postgres-1`
- Verify connection parameters in manager.toml
- Test manual connection: `docker exec -it backend.ai-halfstack-postgres-1 psql -U postgres -d backend`

#### "No supported GPU hardware detected"
- Install NVIDIA drivers and nvidia-smi for NVIDIA GPUs
- Ensure you're on macOS for Apple Silicon GPU detection
- Check GPU visibility: `nvidia-smi` or `system_profiler SPDisplaysDataType`

#### High GPU temperature or power usage
- Check GPU workload: `nvidia-smi` or detailed GPU view
- Monitor GPU processes for runaway applications
- Verify cooling system functionality
- Consider reducing GPU workload intensity

#### High response times
- Check system resources: CPU, memory, disk usage
- Review container logs for errors or warnings
- Monitor Docker container stats: `docker stats`
- Check GPU utilization if Backend.AI is using GPU compute

### Debug Mode

Enable debug logging:
```bash
RUST_LOG=debug ./backend-ai-health-checker all
```

## Development

### Project Structure
```
health-checker/
├── src/
│   ├── main.rs          # CLI interface and main application logic
│   ├── docker.rs        # Docker container health checks
│   ├── services.rs      # Service endpoint health checks  
│   └── checks.rs        # System and configuration checks
├── Cargo.toml           # Rust dependencies and metadata
└── README.md            # This file
```

### Dependencies
- **tokio**: Async runtime
- **reqwest**: HTTP client for API endpoints
- **bollard**: Docker API client
- **redis**: Redis client
- **tokio-postgres**: PostgreSQL async client
- **etcd-rs**: etcd client
- **clap**: Command line argument parsing
- **serde**: Serialization for JSON output
- **tabled**: Pretty table formatting
- **colored**: Terminal colors
- **chrono**: Date/time handling

### Contributing

1. Ensure all services are health-checkable
2. Add new service checks to appropriate modules
3. Update CLI help and documentation
4. Test with various Backend.AI deployment states

## License

MIT License - see LICENSE file for details