# Backend.AI Kubernetes Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying and managing Backend.AI services on Kubernetes using Helm charts with Harbor2 Docker Registry.

## Prerequisites

### Required Tools
- Kubernetes cluster (minikube, kind, or production cluster)
- Helm 3.x installed
- kubectl configured for your cluster
- Docker (for image building)

### Services to Deploy
- Harbor2 Docker Registry (container image repository)
- Backend.AI core services (Manager, Agent, Storage Proxy, App Proxy, Web Server)

### Built Images
Ensure all Backend.AI images are built and pushed to Harbor registry:
- `harbor.backend-ai.local/backend-ai/manager:25.06`
- `harbor.backend-ai.local/backend-ai/agent:25.06`
- `harbor.backend-ai.local/backend-ai/storage-proxy:25.06`
- `harbor.backend-ai.local/backend-ai/app-proxy-coordinator:25.06`
- `harbor.backend-ai.local/backend-ai/app-proxy-worker:25.06`
- `harbor.backend-ai.local/backend-ai/web-server:25.06`

## Setup Local Docker Registry

### Start Local Registry
```bash
# Start local Docker registry if not running
docker run -d -p 5000:5000 --restart=always --name registry registry:2

# Verify registry is running
curl http://localhost:5000/v2/_catalog
```

### Build and Push Backend.AI Images
```bash
# Build all Backend.AI service images
docker build -f Dockerfile.manager -t localhost:5000/backend.ai-manager:25.06 .
docker build -f Dockerfile.agent -t localhost:5000/backend.ai-agent:25.06 .
docker build -f Dockerfile.storage-proxy -t localhost:5000/backend.ai-storage-proxy:25.06 .
docker build -f Dockerfile.app-proxy-coordinator -t localhost:5000/backend.ai-app-proxy-coordinator:25.06 .
docker build -f Dockerfile.app-proxy-worker -t localhost:5000/backend.ai-app-proxy-worker:25.06 .
docker build -f Dockerfile.web-server -t localhost:5000/backend.ai-web-server:25.06 .

# Push all images to local registry
docker push localhost:5000/backend.ai-manager:25.06
docker push localhost:5000/backend.ai-agent:25.06
docker push localhost:5000/backend.ai-storage-proxy:25.06
docker push localhost:5000/backend.ai-app-proxy-coordinator:25.06
docker push localhost:5000/backend.ai-app-proxy-worker:25.06
docker push localhost:5000/backend.ai-web-server:25.06
```

## Kubernetes Namespace Setup

```bash
# Create Backend.AI namespace
kubectl create namespace backend-ai

# Set default namespace context (optional)
kubectl config set-context --current --namespace=backend-ai
```

## Deployment Sequence (UP)

### 1. Install Helm Chart Dependencies
```bash
# Update Helm chart dependencies for each service
cd backend-ai-manager-helm && helm dependency build && cd ..
cd backend-ai-agent-helm && helm dependency build && cd ..
cd backend-ai-storage-proxy-helm && helm dependency build && cd ..
cd backend-ai-app-proxy-helm && helm dependency build && cd ..
cd backend-ai-web-server-helm && helm dependency build && cd ..
```

### 2. Deploy Services in Order

#### Step 1: Deploy Manager (Core Service)
```bash
helm install backend-ai-manager ./backend-ai-manager-helm -n backend-ai

# Wait for Manager to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=backend-ai-manager -n backend-ai --timeout=300s
```

#### Step 2: Deploy Agent
```bash
helm install backend-ai-agent ./backend-ai-agent-helm -n backend-ai

# Wait for Agent to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=backend-ai-agent -n backend-ai --timeout=300s
```

#### Step 3: Deploy Storage Proxy
```bash
helm install backend-ai-storage-proxy ./backend-ai-storage-proxy-helm -n backend-ai

# Wait for Storage Proxy to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=backend-ai-storage-proxy -n backend-ai --timeout=300s
```

#### Step 4: Deploy App Proxy
```bash
helm install backend-ai-app-proxy ./backend-ai-app-proxy-helm -n backend-ai

# Wait for App Proxy to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=backend-ai-app-proxy -n backend-ai --timeout=300s
```

#### Step 5: Deploy Web Server
```bash
helm install backend-ai-web-server ./backend-ai-web-server-helm -n backend-ai

# Wait for Web Server to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=backend-ai-web-server -n backend-ai --timeout=300s
```

### 3. Verify Deployment
```bash
# Check all pods are running
kubectl get pods -n backend-ai

# Check all services
kubectl get svc -n backend-ai

# Check Helm releases
helm list -n backend-ai

# Check logs for any service
kubectl logs -n backend-ai -l app.kubernetes.io/name=backend-ai-manager --tail=50
```

## Service Management Commands

### Check Service Status
```bash
# View all Backend.AI resources
kubectl get all -n backend-ai

# Check specific service logs
kubectl logs -n backend-ai -l app.kubernetes.io/name=backend-ai-manager -f

# Check service endpoints
kubectl get endpoints -n backend-ai
```

### Scale Services
```bash
# Scale Manager replicas
kubectl scale deployment backend-ai-manager -n backend-ai --replicas=2

# Scale Agent replicas
kubectl scale deployment backend-ai-agent -n backend-ai --replicas=3
```

### Update Services
```bash
# Upgrade a service with new configuration
helm upgrade backend-ai-manager ./backend-ai-manager-helm -n backend-ai

# Force restart pods
kubectl rollout restart deployment/backend-ai-manager -n backend-ai
```

## Shutdown Sequence (DOWN)

### 1. Graceful Service Shutdown
```bash
# Uninstall services in reverse order
helm uninstall backend-ai-web-server -n backend-ai
helm uninstall backend-ai-app-proxy -n backend-ai
helm uninstall backend-ai-storage-proxy -n backend-ai
helm uninstall backend-ai-agent -n backend-ai
helm uninstall backend-ai-manager -n backend-ai

# Remove any umbrella charts
helm uninstall backend-ai -n backend-ai 2>/dev/null || true
```

### 2. Clean Up Resources
```bash
# Delete any remaining pods/jobs
kubectl delete pods --all -n backend-ai
kubectl delete jobs --all -n backend-ai

# Delete persistent volume claims (WARNING: This deletes all data)
kubectl delete pvc --all -n backend-ai

# Delete configmaps and secrets (except system ones)
kubectl delete configmap --field-selector metadata.name!=kube-root-ca.crt -n backend-ai
kubectl delete secret --all -n backend-ai
```

### 3. Verify Clean Shutdown
```bash
# Ensure no Backend.AI resources remain
kubectl get all,pvc,configmap,secret -n backend-ai

# Only kube-root-ca.crt configmap should remain
```

### 4. Optional: Remove Namespace
```bash
# Remove entire namespace (only if no longer needed)
kubectl delete namespace backend-ai
```

## Configuration Management

### Key Configuration Files
- `backend-ai-manager-helm/values.yaml` - Manager service configuration
- `backend-ai-agent-helm/values.yaml` - Agent service configuration  
- `backend-ai-storage-proxy-helm/values.yaml` - Storage proxy configuration
- `backend-ai-app-proxy-helm/values.yaml` - App proxy configuration
- `backend-ai-web-server-helm/values.yaml` - Web server configuration

### Important Configuration Parameters
```yaml
# Registry settings (in all values.yaml files)
image:
  registry: localhost:5000
  repository: backend.ai-<service>
  tag: "25.06"

# Resource limits
resources:
  limits:
    cpu: 2
    memory: 4Gi
  requests:
    cpu: 500m
    memory: 1Gi

# Service configuration matching install-dev.sh
config:
  ipc:
    base_path: "/tmp/backend.ai/ipc"
  manager:
    num_proc: 1
    pid_file: "/tmp/backend.ai-manager.pid"
    id: "main"
```

## Troubleshooting

### Common Issues

#### 1. Image Pull Errors
```bash
# Check if local registry is accessible
curl http://localhost:5000/v2/_catalog

# Verify image exists in registry
curl http://localhost:5000/v2/backend.ai-manager/tags/list
```

#### 2. Resource Constraints
```bash
# Check node resources
kubectl describe nodes

# Check pod resource usage
kubectl top pods -n backend-ai

# Reduce resource requests in values.yaml if needed
```

#### 3. Service Connectivity Issues
```bash
# Test service DNS resolution
kubectl run test-pod --rm -i --tty --image=busybox --restart=Never -n backend-ai -- nslookup backend-ai-manager

# Test service connectivity
kubectl run test-pod --rm -i --tty --image=busybox --restart=Never -n backend-ai -- wget -qO- http://backend-ai-manager:8080/
```

#### 4. Configuration Issues
```bash
# Check configmap contents
kubectl get configmap backend-ai-manager-config -o yaml -n backend-ai

# Validate TOML syntax
kubectl exec -it <manager-pod> -n backend-ai -- python -c "import tomli; print('Valid TOML')"
```

### Debug Commands
```bash
# Get detailed pod information
kubectl describe pod <pod-name> -n backend-ai

# Get pod logs with timestamps
kubectl logs <pod-name> -n backend-ai --timestamps=true

# Execute commands in pod
kubectl exec -it <pod-name> -n backend-ai -- bash

# Port forward for local testing
kubectl port-forward svc/backend-ai-manager 8080:8080 -n backend-ai
```

## Performance Monitoring

### Resource Monitoring
```bash
# Monitor resource usage
kubectl top pods -n backend-ai
kubectl top nodes

# Watch pod status continuously
watch kubectl get pods -n backend-ai
```

### Log Aggregation
```bash
# Tail logs from all Manager pods
kubectl logs -f -l app.kubernetes.io/name=backend-ai-manager -n backend-ai

# Export logs to file
kubectl logs deployment/backend-ai-manager -n backend-ai > manager.log
```

## Backup and Recovery

### Backup Data
```bash
# Backup PostgreSQL data
kubectl exec -it backend-ai-manager-postgresql-0 -n backend-ai -- pg_dump -U postgres backend_ai > backup.sql

# Backup ETCD data
kubectl exec -it backend-ai-manager-etcd-0 -n backend-ai -- etcdctl snapshot save /tmp/snapshot.db
kubectl cp backend-ai-manager-etcd-0:/tmp/snapshot.db ./etcd-backup.db -n backend-ai
```

### Restore Data
```bash
# Restore PostgreSQL data
kubectl exec -i backend-ai-manager-postgresql-0 -n backend-ai -- psql -U postgres backend_ai < backup.sql

# Restore ETCD data
kubectl cp ./etcd-backup.db backend-ai-manager-etcd-0:/tmp/snapshot.db -n backend-ai
kubectl exec -it backend-ai-manager-etcd-0 -n backend-ai -- etcdctl snapshot restore /tmp/snapshot.db
```

## Security Considerations

### Network Policies
```yaml
# Example network policy to restrict traffic
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-ai-network-policy
  namespace: backend-ai
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: backend-ai
```

### RBAC Configuration
```bash
# Create service account with minimal permissions
kubectl create serviceaccount backend-ai-service-account -n backend-ai

# Apply appropriate RBAC policies
kubectl apply -f backend-ai-rbac.yaml
```

## Maintenance

### Regular Tasks
1. **Monitor resource usage** and adjust limits as needed
2. **Update images** regularly for security patches
3. **Backup data** before major updates
4. **Monitor logs** for errors and performance issues
5. **Test disaster recovery** procedures periodically

### Update Procedure
1. Build new images with updated tags
2. Push images to registry
3. Update Helm chart values with new tags
4. Perform rolling update using `helm upgrade`
5. Monitor deployment and rollback if issues occur

---

**Note:** This guide assumes Backend.AI version 25.06 with Python 3.13-slim base images and local Docker registry setup. Adjust versions and configurations as needed for your specific deployment.