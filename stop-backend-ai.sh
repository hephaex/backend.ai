#!/bin/bash

# Backend.AI Kubernetes Stop Script
# This script stops and cleans up all Backend.AI services and Harbor2 Registry

set -e

# Configuration
HARBOR_NAMESPACE="harbor-system"
BACKEND_AI_NAMESPACE="backend-ai"

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

# Confirm action
confirm_action() {
    local message="$1"
    local default="${2:-N}"
    
    if [ "$default" = "Y" ]; then
        local prompt="$message [Y/n]: "
    else
        local prompt="$message [y/N]: "
    fi
    
    read -p "$prompt" -r
    REPLY=${REPLY:-$default}
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        return 0
    else
        return 1
    fi
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    check_command "kubectl"
    check_command "helm"
    
    # Check if kubectl can connect to cluster
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster. Please check your kubectl configuration."
        exit 1
    fi
    
    log_success "All prerequisites met"
}

# Stop Backend.AI services
stop_backend_ai_services() {
    log_info "Stopping Backend.AI services..."
    
    if ! kubectl get namespace "$BACKEND_AI_NAMESPACE" &> /dev/null; then
        log_warning "Backend.AI namespace '$BACKEND_AI_NAMESPACE' does not exist"
        return 0
    fi
    
    local services=("web-server" "app-proxy" "storage-proxy" "agent" "manager")
    
    for service in "${services[@]}"; do
        if helm list -n "$BACKEND_AI_NAMESPACE" | grep -q "backend-ai-$service"; then
            log_info "Uninstalling Backend.AI $service..."
            helm uninstall "backend-ai-$service" -n "$BACKEND_AI_NAMESPACE" || log_warning "Failed to uninstall $service"
            log_success "Uninstalled Backend.AI $service"
        else
            log_info "Backend.AI $service not found, skipping"
        fi
    done
    
    # Remove any umbrella chart
    if helm list -n "$BACKEND_AI_NAMESPACE" | grep -q "backend-ai$"; then
        log_info "Uninstalling Backend.AI umbrella chart..."
        helm uninstall backend-ai -n "$BACKEND_AI_NAMESPACE" || log_warning "Failed to uninstall umbrella chart"
    fi
}

# Clean Backend.AI resources
clean_backend_ai_resources() {
    log_info "Cleaning Backend.AI resources..."
    
    if ! kubectl get namespace "$BACKEND_AI_NAMESPACE" &> /dev/null; then
        log_warning "Backend.AI namespace '$BACKEND_AI_NAMESPACE' does not exist"
        return 0
    fi
    
    # Delete remaining pods and jobs
    log_info "Deleting remaining pods and jobs..."
    kubectl delete pods --all -n "$BACKEND_AI_NAMESPACE" --grace-period=30 || log_warning "Some pods may still be terminating"
    kubectl delete jobs --all -n "$BACKEND_AI_NAMESPACE" || log_warning "No jobs to delete or deletion failed"
    
    # Delete configmaps and secrets (except system ones)
    log_info "Deleting configmaps and secrets..."
    kubectl delete configmap --field-selector metadata.name!=kube-root-ca.crt -n "$BACKEND_AI_NAMESPACE" || log_warning "No configmaps to delete"
    kubectl delete secret --all -n "$BACKEND_AI_NAMESPACE" || log_warning "No secrets to delete"
    
    log_success "Backend.AI resources cleaned"
}

# Delete Backend.AI PVCs
delete_backend_ai_pvcs() {
    log_info "Deleting Backend.AI persistent volume claims..."
    
    if ! kubectl get namespace "$BACKEND_AI_NAMESPACE" &> /dev/null; then
        log_warning "Backend.AI namespace '$BACKEND_AI_NAMESPACE' does not exist"
        return 0
    fi
    
    local pvc_count=$(kubectl get pvc -n "$BACKEND_AI_NAMESPACE" --no-headers 2>/dev/null | wc -l)
    
    if [ "$pvc_count" -gt 0 ]; then
        log_warning "This will delete ALL data stored in Backend.AI persistent volumes!"
        if confirm_action "Delete all Backend.AI persistent volume claims (THIS WILL DELETE ALL DATA)?"; then
            kubectl delete pvc --all -n "$BACKEND_AI_NAMESPACE"
            log_success "Deleted Backend.AI persistent volume claims"
        else
            log_info "Skipping PVC deletion"
        fi
    else
        log_info "No Backend.AI PVCs found"
    fi
}

# Stop Harbor Registry
stop_harbor() {
    log_info "Stopping Harbor Registry..."
    
    if ! kubectl get namespace "$HARBOR_NAMESPACE" &> /dev/null; then
        log_warning "Harbor namespace '$HARBOR_NAMESPACE' does not exist"
        return 0
    fi
    
    if helm list -n "$HARBOR_NAMESPACE" | grep -q "harbor"; then
        log_warning "This will stop Harbor Registry and make all images inaccessible!"
        if confirm_action "Stop Harbor Registry?"; then
            helm uninstall harbor -n "$HARBOR_NAMESPACE"
            log_success "Harbor Registry stopped"
        else
            log_info "Skipping Harbor Registry stop"
            return 0
        fi
    else
        log_info "Harbor Registry not found, skipping"
        return 0
    fi
}

# Delete Harbor PVCs
delete_harbor_pvcs() {
    log_info "Deleting Harbor persistent volume claims..."
    
    if ! kubectl get namespace "$HARBOR_NAMESPACE" &> /dev/null; then
        log_warning "Harbor namespace '$HARBOR_NAMESPACE' does not exist"
        return 0
    fi
    
    local pvc_count=$(kubectl get pvc -n "$HARBOR_NAMESPACE" --no-headers 2>/dev/null | wc -l)
    
    if [ "$pvc_count" -gt 0 ]; then
        log_warning "This will delete ALL Harbor data including container images!"
        if confirm_action "Delete all Harbor persistent volume claims (THIS WILL DELETE ALL IMAGES)?"; then
            kubectl delete pvc --all -n "$HARBOR_NAMESPACE"
            log_success "Deleted Harbor persistent volume claims"
        else
            log_info "Skipping Harbor PVC deletion"
        fi
    else
        log_info "No Harbor PVCs found"
    fi
}

# Delete namespaces
delete_namespaces() {
    log_info "Cleaning up namespaces..."
    
    # Delete Backend.AI namespace
    if kubectl get namespace "$BACKEND_AI_NAMESPACE" &> /dev/null; then
        if confirm_action "Delete Backend.AI namespace '$BACKEND_AI_NAMESPACE'?"; then
            kubectl delete namespace "$BACKEND_AI_NAMESPACE"
            log_success "Deleted Backend.AI namespace"
        else
            log_info "Keeping Backend.AI namespace"
        fi
    fi
    
    # Delete Harbor namespace
    if kubectl get namespace "$HARBOR_NAMESPACE" &> /dev/null; then
        if confirm_action "Delete Harbor namespace '$HARBOR_NAMESPACE'?"; then
            kubectl delete namespace "$HARBOR_NAMESPACE"
            log_success "Deleted Harbor namespace"
        else
            log_info "Keeping Harbor namespace"
        fi
    fi
}

# Emergency stop (force delete everything)
emergency_stop() {
    log_warning "🚨 EMERGENCY STOP MODE 🚨"
    log_warning "This will force delete everything without confirmation!"
    
    if ! confirm_action "Continue with emergency stop?"; then
        log_info "Emergency stop cancelled"
        return 0
    fi
    
    # Force delete all deployments
    log_info "Force deleting all deployments..."
    kubectl delete deployment --all -n "$BACKEND_AI_NAMESPACE" --force --grace-period=0 2>/dev/null || true
    kubectl delete deployment --all -n "$HARBOR_NAMESPACE" --force --grace-period=0 2>/dev/null || true
    
    # Force delete all pods
    log_info "Force deleting all pods..."
    kubectl delete pods --all --force --grace-period=0 -n "$BACKEND_AI_NAMESPACE" 2>/dev/null || true
    kubectl delete pods --all --force --grace-period=0 -n "$HARBOR_NAMESPACE" 2>/dev/null || true
    
    # Force delete namespaces
    log_info "Force deleting namespaces..."
    kubectl delete namespace "$BACKEND_AI_NAMESPACE" --force --grace-period=0 2>/dev/null || true
    kubectl delete namespace "$HARBOR_NAMESPACE" --force --grace-period=0 2>/dev/null || true
    
    log_success "Emergency stop completed"
}

# Show current status
show_status() {
    log_info "Current deployment status:"
    echo
    
    log_info "=== Helm Releases ==="
    echo "Backend.AI releases:"
    helm list -n "$BACKEND_AI_NAMESPACE" 2>/dev/null || echo "No Backend.AI releases found"
    echo
    echo "Harbor releases:"
    helm list -n "$HARBOR_NAMESPACE" 2>/dev/null || echo "No Harbor releases found"
    echo
    
    log_info "=== Running Pods ==="
    echo "Backend.AI pods:"
    kubectl get pods -n "$BACKEND_AI_NAMESPACE" 2>/dev/null || echo "No Backend.AI pods found"
    echo
    echo "Harbor pods:"
    kubectl get pods -n "$HARBOR_NAMESPACE" 2>/dev/null || echo "No Harbor pods found"
    echo
    
    log_info "=== Persistent Volume Claims ==="
    echo "Backend.AI PVCs:"
    kubectl get pvc -n "$BACKEND_AI_NAMESPACE" 2>/dev/null || echo "No Backend.AI PVCs found"
    echo
    echo "Harbor PVCs:"
    kubectl get pvc -n "$HARBOR_NAMESPACE" 2>/dev/null || echo "No Harbor PVCs found"
}

# Usage information
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Options:"
    echo "  --services-only     Stop only Backend.AI services (keep Harbor running)"
    echo "  --harbor-only       Stop only Harbor Registry (keep Backend.AI services)"
    echo "  --no-pvcs           Don't delete persistent volume claims (keep data)"
    echo "  --emergency         Emergency stop (force delete everything)"
    echo "  --status            Show current deployment status"
    echo "  --help              Show this help message"
    echo
    echo "Examples:"
    echo "  $0                  # Interactive stop with confirmations"
    echo "  $0 --services-only  # Stop only Backend.AI services"
    echo "  $0 --emergency      # Force delete everything"
    echo "  $0 --status         # Show current status"
}

# Main stop function
main() {
    local services_only=false
    local harbor_only=false
    local no_pvcs=false
    local emergency=false
    local show_status_only=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --services-only)
                services_only=true
                shift
                ;;
            --harbor-only)
                harbor_only=true
                shift
                ;;
            --no-pvcs)
                no_pvcs=true
                shift
                ;;
            --emergency)
                emergency=true
                shift
                ;;
            --status)
                show_status_only=true
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    log_info "Starting Backend.AI and Harbor2 stop procedure..."
    echo
    
    check_prerequisites
    
    # Show status only
    if [ "$show_status_only" = true ]; then
        show_status
        exit 0
    fi
    
    # Emergency stop
    if [ "$emergency" = true ]; then
        emergency_stop
        exit 0
    fi
    
    # Harbor only
    if [ "$harbor_only" = true ]; then
        stop_harbor
        if [ "$no_pvcs" != true ]; then
            delete_harbor_pvcs
        fi
        delete_namespaces
        log_success "🏁 Harbor Registry stop completed!"
        exit 0
    fi
    
    # Services only
    if [ "$services_only" = true ]; then
        stop_backend_ai_services
        clean_backend_ai_resources
        if [ "$no_pvcs" != true ]; then
            delete_backend_ai_pvcs
        fi
        log_success "🏁 Backend.AI services stop completed!"
        exit 0
    fi
    
    # Full stop (default)
    log_info "Full stop mode: This will stop both Backend.AI services and Harbor Registry"
    echo
    
    stop_backend_ai_services
    clean_backend_ai_resources
    
    if [ "$no_pvcs" != true ]; then
        delete_backend_ai_pvcs
    fi
    
    stop_harbor
    
    if [ "$no_pvcs" != true ]; then
        delete_harbor_pvcs
    fi
    
    delete_namespaces
    
    echo
    log_success "🏁 Complete Backend.AI and Harbor2 stop completed!"
    log_info "All services have been stopped and cleaned up"
}

# Run main function
main "$@"