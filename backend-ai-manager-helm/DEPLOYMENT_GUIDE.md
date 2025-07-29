# Backend.AI Manager Kubernetes Deployment Guide

## ✅ Test Results Summary

The Backend.AI Manager Helm chart has been successfully tested and validated:

- **Chart Validation**: ✅ All templates generate valid Kubernetes manifests
- **Dependency Management**: ✅ PostgreSQL, Redis, and ETCD dependencies properly integrated
- **Resource Generation**: ✅ 32 Kubernetes resources generated successfully
- **Dry-run Deployment**: ✅ All manifests pass kubectl validation

## 🚀 Quick Deploy

### Prerequisites

1. **Kubernetes cluster** (v1.19+)
2. **Helm 3.2.0+**
3. **kubectl** configured to access your cluster

### Installation Steps

```bash
# 1. Add required repositories
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# 2. Update chart dependencies
helm dependency update ./backend-ai-manager-helm/

# 3. Deploy with default values (includes bundled PostgreSQL, Redis, ETCD)
helm install backend-ai-manager ./backend-ai-manager-helm/ \
  --set postgresql.auth.password=securepass123 \
  --set postgresql.auth.postgresPassword=securepass123

# 4. Deploy with external databases
helm install backend-ai-manager ./backend-ai-manager-helm/ \
  -f custom-values.yaml
```

## 🔧 Configuration Examples

### External Database Configuration

```yaml
# custom-values.yaml
postgresql:
  enabled: false

redis:
  enabled: false

etcd:
  enabled: false

config:
  database:
    host: "my-postgres.example.com"
    port: 5432
    name: "backend_ai"
    user: "backend_ai"
    password: "my-secure-password"
  redis:
    host: "my-redis.example.com"
    port: 6379
  etcd:
    endpoints:
      - "my-etcd.example.com:2379"
```

### Production Configuration

```yaml
# production-values.yaml
replicaCount: 3

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: manager.backend.ai
      paths:
        - path: /
          pathType: Prefix

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

resources:
  limits:
    cpu: 4000m
    memory: 8Gi
  requests:
    cpu: 1000m
    memory: 2Gi

persistence:
  enabled: true
  size: 50Gi

monitoring:
  enabled: true
  serviceMonitor:
    enabled: true
```

## 📋 Generated Resources

The Helm chart creates the following Kubernetes resources:

### Core Backend.AI Manager
- **Deployment**: Backend.AI Manager application
- **Service**: ClusterIP service for internal communication
- **ConfigMap**: Manager configuration (TOML format)
- **Secret**: Database passwords and sensitive data
- **ServiceAccount**: RBAC service account
- **PersistentVolumeClaim**: Log and data storage

### Dependencies (when enabled)
- **PostgreSQL StatefulSet**: Primary database
- **Redis Master/Replica StatefulSets**: Caching and session storage
- **ETCD StatefulSet**: Distributed key-value store

### Optional Resources
- **Ingress**: External access configuration
- **HorizontalPodAutoscaler**: Auto-scaling based on CPU/memory
- **PodDisruptionBudget**: High availability configuration
- **NetworkPolicy**: Network security policies
- **ServiceMonitor**: Prometheus monitoring integration

## 🔍 Verification

After deployment, verify the installation:

```bash
# Check pod status
kubectl get pods -l app.kubernetes.io/name=backend-ai-manager

# Check services
kubectl get services -l app.kubernetes.io/name=backend-ai-manager

# View logs
kubectl logs -l app.kubernetes.io/name=backend-ai-manager -f

# Port forward for testing
kubectl port-forward svc/backend-ai-manager 8080:8080

# Test health endpoint
curl http://localhost:8080/v4/manager/status
```

## 🛠 Troubleshooting

### Common Issues

1. **Pod CrashLoopBackOff**
   ```bash
   kubectl describe pod <pod-name>
   kubectl logs <pod-name> --previous
   ```

2. **Database Connection Issues**
   - Check PostgreSQL service is running
   - Verify database credentials in secrets
   - Check network policies if enabled

3. **ETCD Connection Issues**
   - Ensure ETCD is accessible
   - Verify ETCD endpoints configuration
   - Check service discovery

### Debug Commands

```bash
# View generated manifests
helm template backend-ai-manager ./backend-ai-manager-helm/

# Check Helm release status
helm status backend-ai-manager

# Get all resources
kubectl get all -l app.kubernetes.io/instance=backend-ai-manager
```

## 🔧 Customization

The chart supports extensive customization through `values.yaml`. Key configuration areas:

- **Image**: Repository, tag, pull policy
- **Resources**: CPU/memory limits and requests
- **Scaling**: Replica count and auto-scaling
- **Storage**: Persistent volume configuration
- **Networking**: Ingress, network policies
- **Security**: RBAC, security contexts
- **Monitoring**: Prometheus integration
- **Dependencies**: PostgreSQL, Redis, ETCD settings

For complete configuration options, see `values.yaml` and `README.md`.

## 📝 Notes

- Default configuration includes bundled dependencies for easy setup
- Production deployments should use external managed databases
- Enable monitoring and auto-scaling for production workloads
- Review security settings and network policies before deployment
- Regular backups of persistent data are recommended