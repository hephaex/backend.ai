#!/bin/bash

# Backend.AI Kubernetes Management Script
# Simple interface to deploy and manage Backend.AI with Harbor2

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

# Show banner
show_banner() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    Backend.AI Manager                       ║"
    echo "║              Kubernetes Deployment Tool                     ║"
    echo "║                 with Harbor2 Registry                       ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Show status
show_status() {
    log_info "Current Backend.AI Deployment Status:"
    echo
    
    # Check Harbor
    if kubectl get namespace harbor-system &>/dev/null; then
        local harbor_pods=$(kubectl get pods -n harbor-system --no-headers 2>/dev/null | wc -l)
        local harbor_ready=$(kubectl get pods -n harbor-system --no-headers 2>/dev/null | grep -c "Running" || echo "0")
        echo -e "🚢 Harbor Registry: ${GREEN}Deployed${NC} ($harbor_ready/$harbor_pods pods running)"
        
        if curl -s http://localhost:30002/api/v2.0/systeminfo &>/dev/null; then
            echo -e "   └─ API Status: ${GREEN}✅ Accessible${NC} (http://localhost:30002)"
        else
            echo -e "   └─ API Status: ${YELLOW}⚠️  Not accessible${NC}"
        fi
    else
        echo -e "🚢 Harbor Registry: ${RED}Not deployed${NC}"
    fi
    
    # Check Backend.AI
    if kubectl get namespace backend-ai &>/dev/null; then
        local backend_pods=$(kubectl get pods -n backend-ai --no-headers 2>/dev/null | wc -l)
        local backend_ready=$(kubectl get pods -n backend-ai --no-headers 2>/dev/null | grep -c "Running" || echo "0")
        echo -e "🤖 Backend.AI Services: ${GREEN}Deployed${NC} ($backend_ready/$backend_pods pods running)"
        
        # Check individual services
        local services=("manager" "agent" "storage-proxy" "app-proxy" "web-server")
        for service in "${services[@]}"; do
            if helm list -n backend-ai 2>/dev/null | grep -q "backend-ai-$service"; then
                local status=$(kubectl get pods -n backend-ai -l "app.kubernetes.io/name=backend-ai-$service" --no-headers 2>/dev/null | awk '{print $3}' | head -1)
                if [ "$status" = "Running" ]; then
                    echo -e "   ├─ $service: ${GREEN}✅ Running${NC}"
                elif [ -z "$status" ]; then
                    echo -e "   ├─ $service: ${YELLOW}⚠️  No pods${NC}"
                else
                    echo -e "   ├─ $service: ${RED}❌ $status${NC}"
                fi
            else
                echo -e "   ├─ $service: ${RED}❌ Not deployed${NC}"
            fi
        done
    else
        echo -e "🤖 Backend.AI Services: ${RED}Not deployed${NC}"
    fi
    
    echo
}

# Show main menu
show_menu() {
    echo -e "${CYAN}Available Commands:${NC}"
    echo
    echo "📦 Deployment:"
    echo "  deploy, up, start     - Deploy all services (Harbor + Backend.AI)"
    echo "  deploy-harbor         - Deploy only Harbor Registry"
    echo "  deploy-services       - Deploy only Backend.AI services"
    echo
    echo "🛑 Management:"
    echo "  stop, down           - Stop all services with confirmation"
    echo "  stop-services        - Stop only Backend.AI services"
    echo "  stop-harbor          - Stop only Harbor Registry"
    echo "  emergency-stop       - Force stop everything immediately"
    echo
    echo "📊 Information:"
    echo "  status, ps           - Show current deployment status"
    echo "  logs                 - Show Backend.AI Manager logs"
    echo "  harbor-ui            - Show Harbor UI access information"
    echo
    echo "🔧 Utilities:"
    echo "  build-images         - Build Backend.AI Docker images"
    echo "  update-charts        - Update Helm charts for Harbor registry"
    echo "  cleanup              - Clean up old resources"
    echo
    echo "❓ Help:"
    echo "  help, --help, -h     - Show this help message"
    echo
}

# Build images only
build_images() {
    log_info "Building Backend.AI Docker images..."
    
    local services=("manager" "agent" "storage-proxy" "app-proxy-coordinator" "app-proxy-worker" "web-server")
    
    for service in "${services[@]}"; do
        if [ -f "$SCRIPT_DIR/Dockerfile.$service" ]; then
            log_info "Building $service image..."
            docker build -f "$SCRIPT_DIR/Dockerfile.$service" \
                -t "localhost:30002/backend-ai/$service:25.06" "$SCRIPT_DIR"
            log_success "Built $service image"
        else
            log_warning "Dockerfile.$service not found, skipping"
        fi
    done
    
    log_success "Image building completed"
}

# Update charts only
update_charts() {
    log_info "Updating Helm charts for Harbor registry..."
    
    if [ -f "$SCRIPT_DIR/update-registry.sh" ]; then
        cd "$SCRIPT_DIR"
        ./update-registry.sh
        log_success "Helm charts updated"
    else
        log_error "update-registry.sh not found"
        exit 1
    fi
}

# Show logs
show_logs() {
    if kubectl get namespace backend-ai &>/dev/null; then
        log_info "Showing Backend.AI Manager logs (Ctrl+C to exit)..."
        kubectl logs -f -l app.kubernetes.io/name=backend-ai-manager -n backend-ai
    else
        log_error "Backend.AI namespace not found"
    fi
}

# Show Harbor UI info
show_harbor_ui() {
    echo -e "${CYAN}Harbor Registry Access Information:${NC}"
    echo
    echo "🌐 Web UI: http://localhost:30002"
    echo "👤 Username: admin"
    echo "🔑 Password: Harbor12345"
    echo
    echo "📋 API Endpoint: http://localhost:30002/api/v2.0/"
    echo
    echo "🐳 Docker Commands:"
    echo "  docker login localhost:30002"
    echo "  docker push localhost:30002/backend-ai/[service]:25.06"
    echo
    
    if curl -s http://localhost:30002/api/v2.0/systeminfo &>/dev/null; then
        echo -e "✅ ${GREEN}Harbor is accessible${NC}"
    else
        echo -e "❌ ${RED}Harbor is not accessible${NC}"
    fi
}

# Cleanup old resources
cleanup() {
    log_info "Cleaning up old Kubernetes resources..."
    
    # Clean up failed pods
    kubectl delete pods --field-selector=status.phase=Failed --all-namespaces 2>/dev/null || true
    
    # Clean up completed jobs
    kubectl delete jobs --field-selector=status.successful=1 --all-namespaces 2>/dev/null || true
    
    log_success "Cleanup completed"
}

# Main function
main() {
    local command="$1"
    
    show_banner
    
    case "$command" in
        deploy|up|start)
            log_info "Starting full deployment..."
            "$SCRIPT_DIR/deploy-backend-ai.sh"
            ;;
        deploy-harbor)
            log_info "Deploying Harbor Registry only..."
            # This would need to be extracted from the main script
            log_warning "Use 'deploy' for full deployment or modify deploy-backend-ai.sh for Harbor-only"
            ;;
        deploy-services)
            log_info "Deploying Backend.AI services only..."
            # This assumes Harbor is already running
            log_warning "Use 'deploy' for full deployment or modify deploy-backend-ai.sh for services-only"
            ;;
        stop|down)
            log_info "Stopping all services..."
            "$SCRIPT_DIR/stop-backend-ai.sh"
            ;;
        stop-services)
            log_info "Stopping Backend.AI services only..."
            "$SCRIPT_DIR/stop-backend-ai.sh" --services-only
            ;;
        stop-harbor)
            log_info "Stopping Harbor Registry only..."
            "$SCRIPT_DIR/stop-backend-ai.sh" --harbor-only
            ;;
        emergency-stop)
            log_warning "Emergency stop initiated..."
            "$SCRIPT_DIR/stop-backend-ai.sh" --emergency
            ;;
        status|ps)
            show_status
            ;;
        logs)
            show_logs
            ;;
        harbor-ui)
            show_harbor_ui
            ;;
        build-images)
            build_images
            ;;
        update-charts)
            update_charts
            ;;
        cleanup)
            cleanup
            ;;
        help|--help|-h|"")
            show_menu
            ;;
        *)
            log_error "Unknown command: $command"
            echo
            show_menu
            exit 1
            ;;
    esac
}

# Run main function
main "$@"