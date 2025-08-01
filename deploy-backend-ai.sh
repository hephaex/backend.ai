#!/bin/bash

# Backend.AI Kubernetes Deployment Script with Harbor2 Registry
# This script deploys Harbor2 Docker Registry and all Backend.AI services

set -e

# Configuration
HARBOR_NAMESPACE="harbor-system"
BACKEND_AI_NAMESPACE="backend-ai"
HARBOR_ADMIN_PASSWORD="Harbor12345"
HARBOR_URL="localhost:30002"
BACKEND_AI_VERSION="25.06"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if command exists
check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 could not be found. Please install $1 first."
        exit 1
    fi
}

# Wait for pods to be ready
wait_for_pods() {
    local namespace=$1
    local label_selector=$2
    local timeout=${3:-300}
    
    log_info "Waiting for pods with label '$label_selector' in namespace '$namespace' to be ready..."
    kubectl wait --for=condition=ready pod -l "$label_selector" -n "$namespace" --timeout="${timeout}s" || {
        log_warning "Some pods may not be ready yet. Continuing..."
    }
}

# Create namespace if it doesn't exist
create_namespace() {
    local namespace=$1
    if ! kubectl get namespace "$namespace" &> /dev/null; then
        log_info "Creating namespace: $namespace"
        kubectl create namespace "$namespace"
        log_success "Namespace $namespace created"
    else
        log_info "Namespace $namespace already exists"
    fi
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    check_command "kubectl"
    check_command "helm"
    check_command "docker"
    check_command "curl"
    
    # Check if kubectl can connect to cluster
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster. Please check your kubectl configuration."
        exit 1
    fi
    
    log_success "All prerequisites met"
}

# Add Harbor Helm repository
add_harbor_repo() {
    log_info "Adding Harbor Helm repository..."
    helm repo add harbor https://helm.goharbor.io
    helm repo update
    log_success "Harbor Helm repository added and updated"
}

# Deploy Harbor2 Registry
deploy_harbor() {
    log_info "Deploying Harbor2 Docker Registry..."
    
    create_namespace "$HARBOR_NAMESPACE"
    
    # Create Harbor values file
    cat > harbor-values.yaml << EOF
expose:
  type: nodePort
  tls:
    enabled: false
  nodePort:
    name: harbor
    ports:
      http:
        port: 80
        nodePort: 30002
      https:
        port: 443
        nodePort: 30003

externalURL: http://harbor.backend-ai.local:30002

harborAdminPassword: "$HARBOR_ADMIN_PASSWORD"

chartmuseum:
  enabled: false
notary:
  enabled: false
trivy:
  enabled: false

persistence:
  enabled: true
  resourcePolicy: "keep"
  persistentVolumeClaim:
    registry:
      size: 20Gi
    database:
      size: 1Gi
    redis:
      size: 1Gi

database:
  type: internal

redis:
  type: internal
EOF

    # Install Harbor
    log_info "Installing Harbor with Helm..."
    helm install harbor harbor/harbor -n "$HARBOR_NAMESPACE" -f harbor-values.yaml
    
    # Wait for Harbor to be ready
    log_info "Waiting for Harbor pods to be ready (this may take 5-10 minutes)..."
    wait_for_pods "$HARBOR_NAMESPACE" "app=harbor" 600
    
    log_success "Harbor2 Registry deployed successfully"
    log_info "Harbor UI: http://$HARBOR_URL"
    log_info "Login: admin / $HARBOR_ADMIN_PASSWORD"
}

# Configure Harbor project
configure_harbor() {
    log_info "Configuring Harbor project..."
    
    # Wait a bit more for Harbor to be fully ready
    sleep 30
    
    # Create backend-ai project
    log_info "Creating backend-ai project in Harbor..."
    curl -u admin:$HARBOR_ADMIN_PASSWORD \
        "http://$HARBOR_URL/api/v2.0/projects" \
        -X POST \
        -H "Content-Type: application/json" \
        -d '{"project_name":"backend-ai","public":true}' \
        --silent --fail || log_warning "Project may already exist"
    
    # Verify project creation
    if curl -u admin:$HARBOR_ADMIN_PASSWORD \
        "http://$HARBOR_URL/api/v2.0/projects" \
        --silent --fail | grep -q "backend-ai"; then
        log_success "Harbor project 'backend-ai' configured"
    else
        log_error "Failed to configure Harbor project"
        exit 1
    fi
}

# Setup Backend.AI namespace and secrets
setup_backend_ai_namespace() {
    log_info "Setting up Backend.AI namespace and secrets..."
    
    create_namespace "$BACKEND_AI_NAMESPACE"
    
    # Create Docker registry secret
    kubectl create secret docker-registry harbor-registry-secret \
        --docker-server="$HARBOR_URL" \
        --docker-username=admin \
        --docker-password="$HARBOR_ADMIN_PASSWORD" \
        --docker-email=admin@backend-ai.local \
        -n "$BACKEND_AI_NAMESPACE" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    log_success "Backend.AI namespace and secrets configured"
}

# Build Backend.AI images
build_images() {
    log_info "Building Backend.AI images..."
    
    local services=("manager" "agent" "storage-proxy" "app-proxy-coordinator" "app-proxy-worker" "web-server")
    
    for service in "${services[@]}"; do
        if [ -f "Dockerfile.$service" ]; then
            log_info "Building $service image..."
            docker build -f "Dockerfile.$service" \
                -t "$HARBOR_URL/backend-ai/$service:$BACKEND_AI_VERSION" .
            log_success "Built $service image"
        else
            log_warning "Dockerfile.$service not found, skipping"
        fi
    done
}

# Update Helm charts for Harbor registry
update_helm_charts() {
    log_info "Updating Helm charts to use Harbor registry..."
    
    local charts=("backend-ai-manager-helm" "backend-ai-agent-helm" "backend-ai-storage-proxy-helm" 
                  "backend-ai-app-proxy-helm" "backend-ai-web-server-helm")
    
    for chart in "${charts[@]}"; do
        if [ -f "$chart/values.yaml" ]; then
            log_info "Updating $chart/values.yaml..."
            
            # Update registry settings
            sed -i.bak "s|registry: localhost:5000|registry: $HARBOR_URL|g" "$chart/values.yaml"
            sed -i.bak 's|repository: backend.ai-|repository: backend-ai/|g' "$chart/values.yaml"
            
            # Add imagePullSecrets if not present
            if ! grep -q "imagePullSecrets" "$chart/values.yaml"; then
                echo "" >> "$chart/values.yaml"
                echo "imagePullSecrets:" >> "$chart/values.yaml"
                echo "  - name: harbor-registry-secret" >> "$chart/values.yaml"
            fi
            
            log_success "Updated $chart/values.yaml"
        else
            log_warning "$chart/values.yaml not found, skipping"
        fi
    done
}

# Build Helm dependencies
build_helm_dependencies() {
    log_info "Building Helm chart dependencies..."
    
    local charts=("backend-ai-manager-helm" "backend-ai-agent-helm" "backend-ai-storage-proxy-helm" 
                  "backend-ai-app-proxy-helm" "backend-ai-web-server-helm")
    
    for chart in "${charts[@]}"; do
        if [ -d "$chart" ]; then
            log_info "Building dependencies for $chart..."
            helm dependency build "./$chart"
            log_success "Built dependencies for $chart"
        fi
    done
}

# Deploy Backend.AI services
deploy_backend_ai_services() {
    log_info "Deploying Backend.AI services..."
    
    # Create fixed Manager configuration
    log_info "Creating Manager configuration..."
    cat > manager-config.yaml << EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: backend-ai-manager-config
  namespace: $BACKEND_AI_NAMESPACE
data:
  manager.toml: |
    [etcd]
    namespace = "/sorna"
    endpoints = ["backend-ai-manager-etcd:2379"]

    [db]
    type = "postgresql"
    addr = { host = "backend-ai-manager-postgresql", port = 5432 }
    name = "backend_ai"
    user = "postgres"

    [redis]
    addr = { host = "backend-ai-manager-redis-master", port = 6379 }

    [manager]
    num-proc = 1
    pid-file = "/tmp/backend.ai-manager.pid"
    id = "main"
    ipc-base-path = "/tmp/backend.ai/ipc"

    [logging]
    level = "INFO"
    drivers = ["console"]

    [debug]
    enabled = false

    [session]
    redis = { host = "backend-ai-manager-redis-master", port = 6379 }

    [api.auth]
    session-timeout = 3600

    [api.ratelimit]
    enabled = true
    redis = { host = "backend-ai-manager-redis-master", port = 6379 }

    [manager.apps]
    cors-enabled = true
    cors-origins = ["*"]

    [manager.plugins]
    scheduler = "fifo"
EOF

    # Deploy services in order
    local services=("manager" "agent" "storage-proxy" "app-proxy" "web-server")
    
    for service in "${services[@]}"; do
        if [ -d "backend-ai-$service-helm" ]; then
            log_info "Deploying Backend.AI $service..."
            helm install "backend-ai-$service" "./backend-ai-$service-helm" -n "$BACKEND_AI_NAMESPACE"
            
            # Apply fixed config for manager
            if [ "$service" = "manager" ]; then
                sleep 10
                kubectl apply -f manager-config.yaml
                kubectl delete pod -l app.kubernetes.io/name=backend-ai-manager -n "$BACKEND_AI_NAMESPACE" || true
            fi
            
            log_success "Deployed Backend.AI $service"
            
            # Wait between deployments
            sleep 30
        else
            log_warning "backend-ai-$service-helm directory not found, skipping"
        fi
    done
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    echo
    log_info "=== Harbor Registry Status ==="
    kubectl get pods -n "$HARBOR_NAMESPACE"
    echo
    
    log_info "=== Backend.AI Services Status ==="
    kubectl get pods -n "$BACKEND_AI_NAMESPACE"
    echo
    
    log_info "=== Harbor API Test ==="
    if curl -s "http://$HARBOR_URL/api/v2.0/systeminfo" > /dev/null; then
        log_success "Harbor API is accessible"
    else
        log_warning "Harbor API may not be ready yet"
    fi
    
    echo
    log_info "=== Deployment Summary ==="
    echo "Harbor UI: http://$HARBOR_URL"
    echo "Login: admin / $HARBOR_ADMIN_PASSWORD"
    echo
    echo "To check logs:"
    echo "kubectl logs -f -l app.kubernetes.io/name=backend-ai-manager -n $BACKEND_AI_NAMESPACE"
    echo
    echo "To access services:"
    echo "kubectl port-forward svc/backend-ai-manager 8080:8080 -n $BACKEND_AI_NAMESPACE"
}

# Main deployment function
main() {
    log_info "Starting Backend.AI with Harbor2 deployment..."
    echo
    
    check_prerequisites
    add_harbor_repo
    deploy_harbor
    configure_harbor
    setup_backend_ai_namespace
    build_images
    update_helm_charts
    build_helm_dependencies
    deploy_backend_ai_services
    verify_deployment
    
    echo
    log_success "🎉 Backend.AI with Harbor2 deployment completed!"
    log_info "Check the verification output above for service status"
}

# Run main function
main "$@"