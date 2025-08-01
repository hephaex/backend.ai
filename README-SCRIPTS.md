# Backend.AI Kubernetes Management Scripts

This directory contains comprehensive bash scripts for managing Backend.AI services with Harbor2 Docker Registry on Kubernetes.

## 📋 Available Scripts

### 🚀 `deploy-backend-ai.sh`
**Complete deployment script for Backend.AI with Harbor2 Registry**

**Features:**
- ✅ Deploys Harbor2 Docker Registry
- ✅ Configures Harbor projects and authentication
- ✅ Builds Backend.AI Docker images
- ✅ Updates Helm charts for Harbor registry
- ✅ Deploys all Backend.AI services in correct order
- ✅ Comprehensive error handling and logging
- ✅ Automatic dependency management

**Usage:**
```bash
./deploy-backend-ai.sh
```

**What it does:**
1. Checks prerequisites (kubectl, helm, docker)
2. Adds Harbor Helm repository
3. Deploys Harbor2 Registry to `harbor-system` namespace
4. Creates `backend-ai` project in Harbor
5. Sets up Kubernetes secrets for Harbor authentication
6. Builds all Backend.AI service images
7. Updates Helm chart configurations
8. Deploys services: Manager → Agent → Storage Proxy → App Proxy → Web Server
9. Verifies deployment status

### 🛑 `stop-backend-ai.sh`
**Comprehensive stop and cleanup script**

**Features:**
- ✅ Interactive confirmations for safety
- ✅ Selective stopping (services only, Harbor only)
- ✅ Data preservation options
- ✅ Emergency stop mode
- ✅ Complete resource cleanup

**Usage:**
```bash
# Interactive stop with confirmations
./stop-backend-ai.sh

# Stop only Backend.AI services (keep Harbor)
./stop-backend-ai.sh --services-only

# Stop only Harbor Registry
./stop-backend-ai.sh --harbor-only

# Keep data (don't delete PVCs)
./stop-backend-ai.sh --no-pvcs

# Emergency stop (force delete everything)
./stop-backend-ai.sh --emergency

# Show current status
./stop-backend-ai.sh --status
```

**Available Options:**
- `--services-only`: Stop only Backend.AI services (keep Harbor running)
- `--harbor-only`: Stop only Harbor Registry (keep Backend.AI services)
- `--no-pvcs`: Don't delete persistent volume claims (preserve data)
- `--emergency`: Emergency stop (force delete everything without confirmation)
- `--status`: Show current deployment status
- `--help`: Show help message

### 🎛️ `manage-backend-ai.sh`
**User-friendly management interface**

**Features:**
- ✅ Simple command interface
- ✅ Real-time status display
- ✅ Individual service management
- ✅ Harbor UI access information
- ✅ Log viewing and utilities

**Usage:**
```bash
# Show help and available commands
./manage-backend-ai.sh

# Deploy everything
./manage-backend-ai.sh deploy

# Stop everything
./manage-backend-ai.sh stop

# Show status
./manage-backend-ai.sh status

# Show logs
./manage-backend-ai.sh logs

# Show Harbor UI info
./manage-backend-ai.sh harbor-ui
```

**Available Commands:**

**Deployment:**
- `deploy`, `up`, `start` - Deploy all services (Harbor + Backend.AI)
- `deploy-harbor` - Deploy only Harbor Registry
- `deploy-services` - Deploy only Backend.AI services

**Management:**
- `stop`, `down` - Stop all services with confirmation
- `stop-services` - Stop only Backend.AI services
- `stop-harbor` - Stop only Harbor Registry
- `emergency-stop` - Force stop everything immediately

**Information:**
- `status`, `ps` - Show current deployment status
- `logs` - Show Backend.AI Manager logs
- `harbor-ui` - Show Harbor UI access information

**Utilities:**
- `build-images` - Build Backend.AI Docker images
- `update-charts` - Update Helm charts for Harbor registry
- `cleanup` - Clean up old resources

## 🔧 Configuration

### Default Settings
- **Harbor Registry**: `localhost:30002`
- **Harbor Admin**: `admin / Harbor12345`
- **Harbor Namespace**: `harbor-system`
- **Backend.AI Namespace**: `backend-ai`
- **Backend.AI Version**: `25.06`

### Harbor Configuration
- **Web UI**: http://localhost:30002
- **Registry**: localhost:30002
- **Project**: backend-ai (public)
- **Storage**: 20Gi for registry, 1Gi each for database and Redis

### Backend.AI Services
- **Manager**: Core orchestration service
- **Agent**: Compute node service
- **Storage Proxy**: Storage access service
- **App Proxy**: Application proxy service (coordinator + worker)
- **Web Server**: Web interface service

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                      │
├─────────────────────────────────────────────────────────────┤
│  harbor-system namespace                                   │
│  ├── Harbor Registry (localhost:30002)                     │
│  │   ├── Core + Database + Redis                          │
│  │   ├── Registry + Portal + JobService                   │
│  │   └── Nginx (NodePort 30002)                           │
│  └── Persistent Volumes (21Gi total)                       │
├─────────────────────────────────────────────────────────────┤
│  backend-ai namespace                                      │
│  ├── Manager (+ PostgreSQL + Redis + ETCD)                 │
│  ├── Agent (+ Redis + ETCD)                               │
│  ├── Storage Proxy (+ PostgreSQL + Redis + ETCD)          │
│  ├── App Proxy Coordinator + Workers (+ PostgreSQL + etc.) │
│  ├── Web Server                                           │
│  └── Harbor Registry Secrets                              │
└─────────────────────────────────────────────────────────────┘
```

## 📚 Quick Start Guide

### 1. Prerequisites
```bash
# Ensure you have these tools installed:
kubectl version
helm version
docker version

# Ensure kubectl is connected to your cluster
kubectl cluster-info
```

### 2. Deploy Everything
```bash
# Simple deployment
./manage-backend-ai.sh deploy

# Or use the direct script
./deploy-backend-ai.sh
```

### 3. Check Status
```bash
# Show status
./manage-backend-ai.sh status

# Access Harbor UI
./manage-backend-ai.sh harbor-ui
```

### 4. Access Services
```bash
# Harbor Registry UI
open http://localhost:30002

# Backend.AI Manager API (after port-forward)
kubectl port-forward svc/backend-ai-manager 8080:8080 -n backend-ai
open http://localhost:8080/v4/manager/status
```

### 5. Stop Services
```bash
# Interactive stop
./manage-backend-ai.sh stop

# Or emergency stop
./manage-backend-ai.sh emergency-stop
```

## 🐛 Troubleshooting

### Common Issues

1. **Image Build Timeout**
   ```bash
   # Build images separately
   ./manage-backend-ai.sh build-images
   ```

2. **Harbor Connection Issues**
   ```bash
   # Check Harbor status
   kubectl get pods -n harbor-system
   curl http://localhost:30002/api/v2.0/systeminfo
   ```

3. **Manager ETCD Connection Issues**
   ```bash
   # Check ETCD connectivity
   kubectl logs -l app.kubernetes.io/name=backend-ai-manager -n backend-ai
   ```

4. **Persistent Storage Issues**
   ```bash
   # Check PVC status
   kubectl get pvc -n harbor-system
   kubectl get pvc -n backend-ai
   ```

### Logs and Debugging
```bash
# Show all logs
./manage-backend-ai.sh logs

# Check specific service
kubectl logs -l app.kubernetes.io/name=backend-ai-manager -n backend-ai

# Check Harbor logs
kubectl logs -l app=harbor-core -n harbor-system
```

### Recovery
```bash
# Clean up failed resources
./manage-backend-ai.sh cleanup

# Emergency stop and redeploy
./manage-backend-ai.sh emergency-stop
./manage-backend-ai.sh deploy
```

## 🔒 Security Notes

- Harbor admin password is set to `Harbor12345` (change in production)
- All services run in separate namespaces for isolation
- Docker registry secrets are automatically managed
- Harbor projects can be configured for private access

## 📈 Production Considerations

1. **Storage**: Adjust PVC sizes based on expected image storage
2. **Resources**: Configure CPU/memory limits in Helm values
3. **Security**: Change default passwords and enable TLS
4. **Backup**: Regular backup of Harbor database and registry data
5. **Monitoring**: Add monitoring and alerting for service health

## 🤝 Contributing

To modify or extend these scripts:

1. Update configuration variables at the top of each script
2. Add new services to the `services` arrays
3. Test thoroughly in development environment
4. Update this documentation

---

**Note**: These scripts are designed for development and testing environments. For production deployment, additional security and reliability measures should be implemented.