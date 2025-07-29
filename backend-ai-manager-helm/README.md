# Backend.AI Manager Helm Chart

A Helm chart for deploying Backend.AI Manager on Kubernetes.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.2.0+
- PV provisioner support in the underlying infrastructure

## Installing the Chart

To install the chart with the release name `backend-ai-manager`:

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm dependency update
helm install backend-ai-manager ./backend-ai-manager-helm
```

## Uninstalling the Chart

To uninstall/delete the `backend-ai-manager` deployment:

```bash
helm delete backend-ai-manager
```

## Configuration

The following table lists the configurable parameters of the Backend.AI Manager chart and their default values.

### Global Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `global.imageRegistry` | Global Docker image registry | `""` |
| `global.imagePullSecrets` | Global Docker registry secret names | `[]` |
| `global.storageClass` | Global StorageClass for Persistent Volume(s) | `""` |

### Image Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `image.registry` | Backend.AI Manager image registry | `docker.io` |
| `image.repository` | Backend.AI Manager image repository | `lablup/backend.ai-manager` |
| `image.tag` | Backend.AI Manager image tag | `23.09.0` |
| `image.pullPolicy` | Image pull policy | `IfNotPresent` |

### Service Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `service.type` | Kubernetes Service type | `ClusterIP` |
| `service.port` | Service port | `8080` |
| `service.targetPort` | Service target port | `8080` |

### Ingress Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `ingress.enabled` | Enable ingress controller resource | `false` |
| `ingress.className` | IngressClass that will be used | `""` |
| `ingress.hosts[0].host` | Hostname for the ingress | `manager.backend.ai.local` |
| `ingress.hosts[0].paths[0].path` | Path for the ingress | `/` |
| `ingress.hosts[0].paths[0].pathType` | Path type for the ingress | `Prefix` |

### Database Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `postgresql.enabled` | Enable PostgreSQL | `true` |
| `postgresql.auth.postgresPassword` | PostgreSQL postgres password | `backend_ai_password` |
| `postgresql.auth.username` | PostgreSQL username | `backend_ai` |
| `postgresql.auth.password` | PostgreSQL password | `backend_ai_password` |
| `postgresql.auth.database` | PostgreSQL database | `backend_ai` |

### Redis Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `redis.enabled` | Enable Redis | `true` |
| `redis.auth.enabled` | Enable Redis auth | `false` |

### ETCD Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `etcd.enabled` | Enable ETCD | `true` |
| `etcd.auth.rbac.enabled` | Enable ETCD RBAC | `false` |

### Persistence Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `persistence.enabled` | Enable persistence | `true` |
| `persistence.storageClass` | Storage class name | `""` |
| `persistence.accessMode` | Access mode | `ReadWriteOnce` |
| `persistence.size` | Storage size | `10Gi` |

## Examples

### Minimal Installation

```bash
helm install backend-ai-manager ./backend-ai-manager-helm
```

### Installation with Custom Values

```yaml
# values-custom.yaml
replicaCount: 2

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: manager.my-domain.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: backend-ai-manager-tls
      hosts:
        - manager.my-domain.com

resources:
  limits:
    cpu: 4000m
    memory: 8Gi
  requests:
    cpu: 1000m
    memory: 2Gi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
```

```bash
helm install backend-ai-manager ./backend-ai-manager-helm -f values-custom.yaml
```

### External Database Configuration

```yaml
# values-external-db.yaml
postgresql:
  enabled: false

config:
  database:
    host: "my-postgres.example.com"
    port: 5432
    name: "backend_ai"
    user: "backend_ai"
    password: "my-secure-password"
```

```bash
helm install backend-ai-manager ./backend-ai-manager-helm -f values-external-db.yaml
```

## Monitoring

To enable Prometheus monitoring:

```yaml
monitoring:
  enabled: true
  serviceMonitor:
    enabled: true
    interval: 30s
    scrapeTimeout: 10s
    path: /metrics
```

## Troubleshooting

### Check Pod Status

```bash
kubectl get pods -l app.kubernetes.io/name=backend-ai-manager
```

### View Logs

```bash
kubectl logs -l app.kubernetes.io/name=backend-ai-manager -f
```

### Check Configuration

```bash
kubectl get configmap backend-ai-manager-config -o yaml
```

### Verify Dependencies

```bash
# Check PostgreSQL
kubectl get pods -l app.kubernetes.io/name=postgresql

# Check Redis
kubectl get pods -l app.kubernetes.io/name=redis

# Check ETCD
kubectl get pods -l app.kubernetes.io/name=etcd
```

## Support

For more information about Backend.AI, visit [https://backend.ai](https://backend.ai)

For issues related to this Helm chart, please open an issue in the Backend.AI repository.