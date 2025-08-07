#!/bin/bash

# Backend.AI KubeVirt GPU Deployment Script
# This script deploys KubeVirt with GPU passthrough and Backend.AI GPU Agent VMs

set -e

# Configuration
KUBEVIRT_VERSION="v1.1.1"
CDI_VERSION="v1.58.1"
GPU_OPERATOR_VERSION="v23.9.1"
BACKEND_AI_GPU_NAMESPACE="backend-ai-gpu"
BACKEND_AI_NAMESPACE="backend-ai"
HARBOR_NAMESPACE="harbor-system"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

log_header() {
    echo -e "${PURPLE}=== $1 ===${NC}"
}

# Check if command exists
check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 could not be found. Please install $1 first."
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    log_header "Checking Prerequisites"
    
    check_command kubectl
    check_command helm
    check_command docker
    
    # Check if kubectl can connect to cluster
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster. Please check your kubectl configuration."
        exit 1
    fi
    
    # Check for GPU nodes
    GPU_NODES=$(kubectl get nodes -l nvidia.com/gpu.workload.config=vm-passthrough --no-headers 2>/dev/null | wc -l || echo 0)
    if [ "$GPU_NODES" -eq 0 ]; then
        log_warning "No nodes labeled for GPU VM passthrough found. Please label GPU nodes with 'nvidia.com/gpu.workload.config=vm-passthrough'"
        log_info "To label nodes: kubectl label nodes <node-name> nvidia.com/gpu.workload.config=vm-passthrough"
    else
        log_success "Found $GPU_NODES GPU nodes ready for VM passthrough"
    fi
    
    log_success "Prerequisites check completed"
}

# Install KubeVirt
install_kubevirt() {
    log_header "Installing KubeVirt"
    
    # Check if KubeVirt is already installed
    if kubectl get namespace kubevirt &> /dev/null; then
        log_info "KubeVirt namespace already exists, checking installation..."
        if kubectl get kubevirt kubevirt -n kubevirt &> /dev/null; then
            log_info "KubeVirt is already installed, updating configuration..."
        fi
    else
        log_info "Installing KubeVirt operator..."
        kubectl apply -f https://github.com/kubevirt/kubevirt/releases/download/${KUBEVIRT_VERSION}/kubevirt-operator.yaml
        
        log_info "Installing KubeVirt custom resource..."
        kubectl apply -f https://github.com/kubevirt/kubevirt/releases/download/${KUBEVIRT_VERSION}/kubevirt-cr.yaml
    fi
    
    # Apply KubeVirt GPU configuration
    log_info "Applying KubeVirt GPU configuration..."
    kubectl apply -f kubevirt-gpu-setup.yaml
    
    # Wait for KubeVirt to be ready
    log_info "Waiting for KubeVirt to be ready..."
    kubectl wait --for=condition=Available kubevirt kubevirt -n kubevirt --timeout=600s
    
    log_success "KubeVirt installation completed"
}

# Install Containerized Data Importer (CDI)
install_cdi() {
    log_header "Installing Containerized Data Importer (CDI)"
    
    if kubectl get namespace cdi &> /dev/null; then
        log_info "CDI is already installed"
    else
        log_info "Installing CDI operator..."
        kubectl apply -f https://github.com/kubevirt/containerized-data-importer/releases/download/${CDI_VERSION}/cdi-operator.yaml
        
        log_info "Installing CDI custom resource..."
        kubectl apply -f https://github.com/kubevirt/containerized-data-importer/releases/download/${CDI_VERSION}/cdi-cr.yaml
        
        # Wait for CDI to be ready
        log_info "Waiting for CDI to be ready..."
        kubectl wait --for=condition=Available cdi cdi -n cdi --timeout=300s
    fi
    
    log_success "CDI installation completed"
}

# Install NVIDIA GPU Operator
install_gpu_operator() {
    log_header "Installing NVIDIA GPU Operator"
    
    # Add NVIDIA Helm repository
    if ! helm repo list | grep -q nvidia; then
        log_info "Adding NVIDIA Helm repository..."
        helm repo add nvidia https://helm.ngc.nvidia.com/nvidia
        helm repo update
    fi
    
    # Check if GPU Operator is already installed
    if helm list -n gpu-operator | grep -q gpu-operator; then
        log_info "NVIDIA GPU Operator is already installed, upgrading..."
        helm upgrade gpu-operator nvidia/gpu-operator \
          --namespace gpu-operator \
          --set sandboxWorkloads.enabled=true \
          --set toolkit.enabled=true \
          --set driver.enabled=true \
          --set migManager.enabled=false
    else
        log_info "Installing NVIDIA GPU Operator..."
        kubectl create namespace gpu-operator || true
        
        helm install gpu-operator nvidia/gpu-operator \
          --namespace gpu-operator \
          --set sandboxWorkloads.enabled=true \
          --set toolkit.enabled=true \
          --set driver.enabled=true \
          --set migManager.enabled=false \
          --version ${GPU_OPERATOR_VERSION}
    fi
    
    # Wait for GPU Operator to be ready
    log_info "Waiting for GPU Operator pods to be ready..."
    kubectl wait --for=condition=ready pod -l app=nvidia-operator-validator -n gpu-operator --timeout=600s || true
    
    log_success "NVIDIA GPU Operator installation completed"
}

# Setup networking
setup_networking() {
    log_header "Setting up KubeVirt Networking"
    
    # Apply network configuration
    log_info "Applying network configuration..."
    kubectl apply -f kubevirt-network-config.yaml
    
    # Install Multus CNI (if not already present)
    if ! kubectl get daemonset multus-cni -n kube-system &> /dev/null; then
        log_info "Installing Multus CNI..."
        kubectl apply -f https://raw.githubusercontent.com/k8snetworkplumbingwg/multus-cni/master/deployments/multus-daemonset.yml
    else
        log_info "Multus CNI is already installed"
    fi
    
    log_success "Networking setup completed"
}

# Deploy GPU base image
build_gpu_base_image() {
    log_header "Building GPU Base Image"
    
    # Check if Harbor is running
    if ! kubectl get pods -n $HARBOR_NAMESPACE -l app=harbor,component=core --field-selector=status.phase=Running | grep -q harbor; then
        log_error "Harbor registry is not running. Please deploy Harbor first using: ./manage-backend-ai.sh deploy-harbor"
        exit 1
    fi
    
    log_info "Building Ubuntu GPU base image..."
    cat > Dockerfile.ubuntu-gpu << 'EOF'
FROM ubuntu:22.04

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    gnupg2 \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    lsb-release \
    && rm -rf /var/lib/apt/lists/*

# Install NVIDIA drivers and CUDA toolkit
RUN apt-get update && apt-get install -y \
    nvidia-driver-535 \
    nvidia-utils-535 \
    cuda-toolkit-12-2 \
    && rm -rf /var/lib/apt/lists/*

# Install Docker
RUN curl -fsSL https://get.docker.com | sh

# Install Python and Backend.AI dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables
ENV NVIDIA_VISIBLE_DEVICES=all
ENV NVIDIA_DRIVER_CAPABILITIES=compute,utility

# Create backend-ai user
RUN useradd -m -s /bin/bash backend-ai && \
    usermod -aG sudo,docker backend-ai && \
    echo "backend-ai ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

WORKDIR /home/backend-ai
USER backend-ai

CMD ["/bin/bash"]
EOF

    # Build and push the image
    log_info "Building GPU base image..."
    docker build -f Dockerfile.ubuntu-gpu -t localhost:30002/backend-ai/ubuntu-gpu:22.04 .
    
    log_info "Pushing GPU base image to Harbor..."
    docker push localhost:30002/backend-ai/ubuntu-gpu:22.04
    
    # Clean up
    rm -f Dockerfile.ubuntu-gpu
    
    log_success "GPU base image built and pushed successfully"
}

# Deploy Backend.AI GPU Agents
deploy_gpu_agents() {
    log_header "Deploying Backend.AI GPU Agent VMs"
    
    # Create namespace
    kubectl create namespace $BACKEND_AI_GPU_NAMESPACE || true
    
    # Create Harbor registry secret
    log_info "Creating Harbor registry secret..."
    kubectl create secret docker-registry harbor-registry-secret \
        --docker-server=localhost:30002 \
        --docker-username=admin \
        --docker-password=Harbor12345 \
        -n $BACKEND_AI_GPU_NAMESPACE || true
    
    # Deploy using Helm chart
    log_info "Installing Backend.AI GPU Agent Helm chart..."
    helm upgrade --install backend-ai-gpu-agents ./backend-ai-gpu-agent-helm \
        --namespace $BACKEND_AI_GPU_NAMESPACE \
        --set vm.replicas=1 \
        --set vm.resources.gpu.enabled=true \
        --wait --timeout=1200s
    
    log_success "Backend.AI GPU Agent VMs deployed successfully"
}

# Verify deployment
verify_deployment() {
    log_header "Verifying Deployment"
    
    log_info "Checking KubeVirt components..."
    kubectl get pods -n kubevirt
    
    log_info "Checking CDI components..."
    kubectl get pods -n cdi
    
    log_info "Checking GPU Operator..."
    kubectl get pods -n gpu-operator
    
    log_info "Checking Backend.AI GPU VMs..."
    kubectl get vms -n $BACKEND_AI_GPU_NAMESPACE
    kubectl get vmis -n $BACKEND_AI_GPU_NAMESPACE
    
    log_info "Checking GPU VM pods..."
    kubectl get pods -n $BACKEND_AI_GPU_NAMESPACE
    
    log_info "Checking services..."
    kubectl get svc -n $BACKEND_AI_GPU_NAMESPACE
    
    # Check if VMs are running
    RUNNING_VMS=$(kubectl get vms -n $BACKEND_AI_GPU_NAMESPACE --no-headers | grep -c Running || echo 0)
    if [ "$RUNNING_VMS" -gt 0 ]; then
        log_success "$RUNNING_VMS GPU VM(s) are running"
    else
        log_warning "No GPU VMs are running yet, they may still be starting up"
    fi
    
    log_success "Deployment verification completed"
}

# Test GPU access
test_gpu_access() {
    log_header "Testing GPU Access in VMs"
    
    # Wait for VMs to be ready
    log_info "Waiting for VMs to be ready..."
    sleep 60
    
    # Get running VMs
    RUNNING_VMS=$(kubectl get vmis -n $BACKEND_AI_GPU_NAMESPACE --no-headers 2>/dev/null | awk '{print $1}' || echo "")
    
    if [ -z "$RUNNING_VMS" ]; then
        log_warning "No running VM instances found. VMs may still be starting up."
        return
    fi
    
    for VM in $RUNNING_VMS; do
        log_info "Testing GPU access in VM: $VM"
        
        # Test nvidia-smi command
        if kubectl exec -n $BACKEND_AI_GPU_NAMESPACE $VM -- nvidia-smi &> /dev/null; then
            log_success "GPU access confirmed in VM: $VM"
            kubectl exec -n $BACKEND_AI_GPU_NAMESPACE $VM -- nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv
        else
            log_warning "GPU access test failed for VM: $VM (VM may still be initializing)"
        fi
    done
}

# Main deployment function
main() {
    log_header "Backend.AI KubeVirt GPU Deployment"
    echo "This script will deploy KubeVirt with GPU passthrough and Backend.AI GPU Agent VMs"
    echo
    
    check_prerequisites
    install_kubevirt
    install_cdi
    install_gpu_operator
    setup_networking
    build_gpu_base_image
    deploy_gpu_agents
    verify_deployment
    test_gpu_access
    
    log_success "Backend.AI KubeVirt GPU deployment completed successfully!"
    echo
    log_info "Next steps:"
    echo "1. Check VM status: kubectl get vms -n $BACKEND_AI_GPU_NAMESPACE"
    echo "2. Monitor VM logs: kubectl logs -f -n $BACKEND_AI_GPU_NAMESPACE <virt-launcher-pod-name>"
    echo "3. Access VM console: virtctl console -n $BACKEND_AI_GPU_NAMESPACE <vm-name>"
    echo "4. Verify Backend.AI Agent connection with Manager"
    echo
    log_info "GPU VM Management:"
    echo "- Scale VMs: helm upgrade backend-ai-gpu-agents ./backend-ai-gpu-agent-helm --set vm.replicas=<number>"
    echo "- Update config: helm upgrade backend-ai-gpu-agents ./backend-ai-gpu-agent-helm -f custom-values.yaml"
    echo "- Remove VMs: helm uninstall backend-ai-gpu-agents -n $BACKEND_AI_GPU_NAMESPACE"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "verify")
        verify_deployment
        ;;
    "test-gpu")
        test_gpu_access
        ;;
    "cleanup")
        log_header "Cleaning up KubeVirt GPU deployment"
        helm uninstall backend-ai-gpu-agents -n $BACKEND_AI_GPU_NAMESPACE || true
        kubectl delete namespace $BACKEND_AI_GPU_NAMESPACE || true
        log_success "Cleanup completed"
        ;;
    *)
        echo "Usage: $0 [deploy|verify|test-gpu|cleanup]"
        echo "  deploy    - Full deployment (default)"
        echo "  verify    - Verify existing deployment"
        echo "  test-gpu  - Test GPU access in VMs"
        echo "  cleanup   - Remove GPU VMs and resources"
        exit 1
        ;;
esac