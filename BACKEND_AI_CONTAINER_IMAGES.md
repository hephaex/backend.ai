# Backend.AI Container Images

This document lists the official Backend.AI container images used in the Kubernetes Helm charts.

## Registry Information

**Primary Registry**: `cr.backend.ai`
- **Registry Type**: Harbor2 registry hosted by Lablup
- **Projects Available**: `stable`, `community`, `multiarch`
- **Authentication**: Required for private repositories

## Backend.AI Service Images

All Backend.AI services use the `cr.backend.ai/stable/` namespace for production deployments.

### Core Services

| Service | Image | Port | Description |
|---------|-------|------|-------------|
| **Manager** | `cr.backend.ai/stable/backend.ai-manager:24.03` | 8080 | Central control plane and API server |
| **Agent** | `cr.backend.ai/stable/backend.ai-agent:24.03` | 6011, 6019 | Compute node executor with GPU support |
| **Storage Proxy** | `cr.backend.ai/stable/backend.ai-storage-proxy:24.03` | 6021 | File and storage management service |
| **Web Server** | `cr.backend.ai/stable/backend.ai-web-server:24.03` | 8090 | Frontend web interface |

### App Proxy Services

| Service | Image | Port | Description |
|---------|-------|------|-------------|
| **App Proxy Coordinator** | `cr.backend.ai/stable/backend.ai-app-proxy-coordinator:24.03` | 10200 | Application proxy coordinator |
| **App Proxy Worker** | `cr.backend.ai/stable/backend.ai-app-proxy-worker:24.03` | 10201 | Application proxy worker processes |

## Infrastructure Images (from install-dev.sh)

These are the infrastructure components used by Backend.AI:

| Service | Image | Port | Notes |
|---------|-------|------|-------|
| **PostgreSQL** | `postgres:16.3-alpine` | 5432 | Primary database |
| **Redis** | `redis:7.2.4-alpine` | 6379 | Cache and session storage |
| **ETCD** | `quay.io/coreos/etcd:v3.5.14` | 2379 | Distributed configuration |

## Kernel Images

Backend.AI uses architecture-specific kernel images for compute workloads:

### ARM64/AArch64
```
cr.backend.ai/multiarch/python:3.9-ubuntu20.04
```

### x86_64
```
cr.backend.ai/stable/python:3.9-ubuntu20.04
```

## Version Tags

- **Current Version**: `24.03` (Latest stable)
- **Previous Version**: `23.09` (Legacy)
- **Development**: `main` (Development branch)

## Authentication Requirements

To pull images from `cr.backend.ai`:

1. **Docker Login**:
   ```bash
   docker login cr.backend.ai
   ```

2. **Kubernetes Image Pull Secrets**:
   ```bash
   kubectl create secret docker-registry backend-ai-registry \
     --docker-server=cr.backend.ai \
     --docker-username=<username> \
     --docker-password=<password> \
     --docker-email=<email>
   ```

3. **Helm Chart Configuration**:
   ```yaml
   image:
     pullSecrets:
       - name: backend-ai-registry
   ```

## Architecture Support

- **AMD64 (x86_64)**: Primary architecture, full support
- **ARM64 (AArch64)**: Supported via `multiarch` project
- **Multi-platform**: Available for cloud and edge deployments

## Registry Configuration

Backend.AI services are configured to use the official registry by default:

```yaml
# In Helm values.yaml
global:
  imageRegistry: "cr.backend.ai"

# Individual service configuration
image:
  registry: cr.backend.ai
  repository: stable/backend.ai-manager
  tag: "24.03"
```

## Important Notes

1. **Authentication Required**: All `cr.backend.ai` images require proper authentication
2. **Source-First**: Backend.AI is primarily designed to be built from source
3. **Registry Migration**: Previously used Docker Hub, now uses cr.backend.ai
4. **Version Compatibility**: Use matching versions across all Backend.AI services
5. **Development**: For development, consider building from source using install-dev.sh

## References

- **Backend.AI Repository**: https://github.com/lablup/backend.ai
- **Container Registry**: https://cr.backend.ai
- **Documentation**: https://docs.backend.ai
- **Installation Guide**: scripts/install-dev.sh in the Backend.AI repository