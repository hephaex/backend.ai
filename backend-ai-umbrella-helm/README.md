# Backend.AI Kubernetes Helm Charts

This repository contains comprehensive Helm charts for deploying the complete Backend.AI platform on Kubernetes.

## 📋 Overview

Backend.AI is a streamlined cloud-native computing platform for AI/ML and other compute-intensive workloads. This umbrella chart deploys all necessary components:

### Core Services
- **Manager**: Central control plane for managing compute sessions and resources
- **Agent**: Compute node service that executes user workloads (with GPU support)
- **Storage Proxy**: File and data management service
- **App Proxy**: Application proxy coordinator and workers
- **Web Server**: Frontend dashboard and user interface

### Infrastructure Dependencies
- **PostgreSQL**: Primary database for metadata and user data
- **Redis**: Caching and session storage
- **ETCD**: Distributed configuration and service discovery

## 🚀 Quick Start

### Prerequisites

- Kubernetes cluster (v1.19+)
- Helm 3.2.0+
- kubectl configured for your cluster

### Installation

1. **Add Bitnami repository** (for infrastructure dependencies):
```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
```

2. **Update dependencies**:
```bash
helm dependency update ./backend-ai-umbrella-helm/
```

3. **Deploy Backend.AI platform**:
```bash
# Basic deployment with all components
helm install backend-ai ./backend-ai-umbrella-helm/

# Custom configuration
helm install backend-ai ./backend-ai-umbrella-helm/ -f custom-values.yaml
```

4. **Access the platform**:
   - Web UI: http://backend.ai (configure ingress)
   - Default login: admin@lablup.com / wJalrXUt

## 📁 Chart Structure

```
backend-ai-umbrella-helm/          # Main umbrella chart
├── Chart.yaml                     # Chart metadata and dependencies
├── values.yaml                    # Default configuration values
└── templates/
    ├── NOTES.txt                  # Post-installation instructions
    └── _helpers.tpl               # Template helpers

backend-ai-manager-helm/           # Manager service chart
backend-ai-agent-helm/             # Agent service chart  
backend-ai-storage-proxy-helm/     # Storage proxy chart
backend-ai-app-proxy-helm/         # App proxy chart
backend-ai-web-server-helm/        # Web server chart
```

## ⚙️ Configuration

### Component Control

Enable/disable individual components:

```yaml
# values.yaml
manager:
  enabled: true
agent:
  enabled: true
storageProxy:
  enabled: true
appProxy:
  enabled: true
webServer:
  enabled: true

# Infrastructure
postgresql:
  enabled: true
redis:
  enabled: true
etcd:
  enabled: true
```

### Resource Configuration

```yaml
manager:
  resources:
    limits:
      cpu: 2000m
      memory: 4Gi
    requests:
      cpu: 500m
      memory: 1Gi

agent:
  resources:
    limits:
      cpu: 8000m
      memory: 16Gi
      nvidia.com/gpu: 1  # GPU allocation
```

### External Dependencies

Use external databases instead of bundled ones:

```yaml
postgresql:
  enabled: false

manager:
  config:
    database:
      host: "external-postgres.example.com"
      port: 5432
      name: "backend_ai"
      user: "backend_ai"
      password: "secure-password"
```

### Ingress Configuration

```yaml
webServer:
  ingress:
    enabled: true
    className: nginx
    hosts:
      - host: backend.ai
        paths:
          - path: /
            pathType: Prefix
    tls:
      - secretName: backend-ai-tls
        hosts:
          - backend.ai
```

## 🔧 Production Configuration

### High Availability

```yaml
manager:
  replicaCount: 3
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 10

postgresql:
  replicaCount: 3
  
redis:
  sentinel:
    enabled: true
    
etcd:
  replicaCount: 3
```

### Security

```yaml
# Change default passwords
commonConfig:
  secrets:
    managerPassword: "your-secure-password"
    sessionSecretKey: "your-session-secret"

# Enable security policies
security:
  podSecurityPolicy:
    enabled: true
  networkPolicy:
    enabled: true
```

### Persistence

```yaml
postgresql:
  primary:
    persistence:
      enabled: true
      size: 100Gi
      storageClass: "fast-ssd"

manager:
  persistence:
    enabled: true
    size: 50Gi
    storageClass: "fast-ssd"
```

## 🖥️ GPU Support

For AI/ML workloads requiring GPU acceleration:

```yaml
agent:
  gpu:
    enabled: true
    runtime: nvidia
    nodeSelector:
      accelerator: nvidia-tesla-v100
  
  resources:
    limits:
      nvidia.com/gpu: 2
```

**Prerequisites:**
- GPU-enabled Kubernetes nodes
- NVIDIA Device Plugin installed
- NVIDIA Container Runtime configured

## 🔍 Monitoring

### Built-in Health Checks

All services include health check endpoints:
- Manager: `/v4/manager/status`
- Agent: `/`
- Storage Proxy: `/`
- App Proxy: `/`
- Web Server: `/`

### Prometheus Integration

```yaml
monitoring:
  enabled: true

manager:
  monitoring:
    serviceMonitor:
      enabled: true
```

### Log Aggregation

```bash
# View logs from all components
kubectl logs -l app.kubernetes.io/instance=backend-ai -f

# Component-specific logs
kubectl logs -l app.kubernetes.io/name=backend-ai-manager -f
kubectl logs -l app.kubernetes.io/name=backend-ai-agent -f
```

## 🚨 Troubleshooting

### Common Issues

1. **Pods in CrashLoopBackOff**
   ```bash
   kubectl describe pod <pod-name>
   kubectl logs <pod-name> --previous
   ```

2. **Database Connection Issues**
   - Verify PostgreSQL is running: `kubectl get pods -l app.kubernetes.io/name=postgresql`
   - Check connection strings in ConfigMaps
   - Validate credentials in Secrets

3. **GPU Not Available**
   - Ensure GPU nodes are labeled correctly
   - Verify NVIDIA Device Plugin is running
   - Check node capacity: `kubectl describe nodes`

### Debug Commands

```bash
# Check all Backend.AI resources
kubectl get all -l app.kubernetes.io/instance=backend-ai

# Validate Helm deployment
helm status backend-ai
helm get values backend-ai

# Check resource consumption
kubectl top pods -l app.kubernetes.io/instance=backend-ai
```

## 🔄 Upgrade Process

```bash
# Update dependencies
helm dependency update ./backend-ai-umbrella-helm/

# Upgrade deployment
helm upgrade backend-ai ./backend-ai-umbrella-helm/ -f values.yaml

# Rollback if needed
helm rollback backend-ai 1
```

## 🧹 Cleanup

```bash
# Uninstall Backend.AI
helm uninstall backend-ai

# Clean up PVCs (if desired)
kubectl delete pvc -l app.kubernetes.io/instance=backend-ai
```

## 📚 Additional Resources

- [Backend.AI Documentation](https://docs.backend.ai)
- [Architecture Guide](https://docs.backend.ai/en/latest/overview/architecture.html)
- [API Reference](https://docs.backend.ai/en/latest/manager/rest-api.html)
- [GitHub Repository](https://github.com/lablup/backend.ai)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with `helm lint` and `helm template`
5. Submit a pull request

## 📄 License

This project is licensed under the LGPLv3 License - see the [LICENSE](LICENSE) file for details.

---

For support and questions, please visit our [GitHub Issues](https://github.com/lablup/backend.ai/issues) page.