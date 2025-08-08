#!/bin/bash

# Backend.AI vLLM Deployment Examples and Utilities
# This script provides example deployments and utility functions

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_header() {
    echo -e "${PURPLE}=== $1 ===${NC}"
}

# Example deployments
example_small_model() {
    log_header "Example: Small Model (DialoGPT-medium)"
    echo "Deploying Microsoft DialoGPT-medium with 1 GPU and 8GB memory..."
    echo
    echo "Command:"
    echo "./deploy-vllm-model.sh -g 1 -m 8g -c 2 --wait microsoft/DialoGPT-medium"
    echo
    
    read -p "Run this example? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ./deploy-vllm-model.sh -g 1 -m 8g -c 2 --wait microsoft/DialoGPT-medium
    fi
}

example_medium_model() {
    log_header "Example: Medium Model (Llama-2-7B)"
    echo "Deploying Llama-2-7B-Chat with 1 GPU and 16GB memory..."
    echo
    echo "Command:"
    echo "./deploy-vllm-model.sh -g 1 -m 16g -c 4 --max-model-len 4096 --wait meta-llama/Llama-2-7b-chat-hf"
    echo
    
    read -p "Run this example? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ./deploy-vllm-model.sh -g 1 -m 16g -c 4 --max-model-len 4096 --wait meta-llama/Llama-2-7b-chat-hf
    fi
}

example_large_model() {
    log_header "Example: Large Model (Llama-2-70B with Quantization)"
    echo "Deploying Llama-2-70B with AWQ quantization and 4 GPUs..."
    echo
    echo "Command:"
    echo "./deploy-vllm-model.sh -g 4 -m 64g -c 16 --quantization awq --tensor-parallel-size 4 --max-model-len 8192 --wait meta-llama/Llama-2-70b-chat-hf"
    echo
    
    read -p "Run this example? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ./deploy-vllm-model.sh -g 4 -m 64g -c 16 --quantization awq --tensor-parallel-size 4 --max-model-len 8192 --wait meta-llama/Llama-2-70b-chat-hf
    fi
}

example_private_model() {
    log_header "Example: Private Model with HuggingFace Token"
    echo "Deploying private model with HuggingFace authentication..."
    echo
    echo "Command:"
    echo "./deploy-vllm-model.sh --huggingface-token YOUR_HF_TOKEN -g 2 -m 24g --wait your-org/private-model"
    echo
    echo "Note: Replace YOUR_HF_TOKEN with your actual HuggingFace token"
    echo "      Replace your-org/private-model with your private model path"
    echo
}

example_custom_settings() {
    log_header "Example: Custom vLLM Settings"
    echo "Deploying with custom vLLM configuration..."
    echo
    echo "Command:"
    echo "./deploy-vllm-model.sh \\"
    echo "  --gpu-count 2 \\"
    echo "  --memory 32g \\"
    echo "  --cpu-count 8 \\"
    echo "  --max-model-len 8192 \\"
    echo "  --dtype float16 \\"
    echo "  --trust-remote-code \\"
    echo "  --session-name my-custom-vllm \\"
    echo "  --scaling-group gpu-nodes \\"
    echo "  --wait \\"
    echo "  microsoft/DialoGPT-large"
    echo
    
    read -p "Run this example? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ./deploy-vllm-model.sh \
          --gpu-count 2 \
          --memory 32g \
          --cpu-count 8 \
          --max-model-len 8192 \
          --dtype float16 \
          --trust-remote-code \
          --session-name my-custom-vllm \
          --scaling-group gpu-nodes \
          --wait \
          microsoft/DialoGPT-large
    fi
}

# Utility functions
list_sessions() {
    log_header "Backend.AI Sessions"
    log_info "Listing all compute sessions..."
    
    python3 << 'EOF'
import asyncio
from ai.backend.client.session import AsyncSession

async def list_sessions():
    try:
        async with AsyncSession() as api_session:
            sessions = await api_session.ComputeSession.list()
            
            print(f"{'Session Name':<30} {'Status':<12} {'Image':<25} {'Created':<20}")
            print("-" * 90)
            
            for session in sessions:
                name = session.get('name', 'N/A')[:29]
                status = session.get('status', 'N/A')
                image = session.get('image', 'N/A')[:24]
                created = session.get('created_at', 'N/A')[:19]
                print(f"{name:<30} {status:<12} {image:<25} {created:<20}")
                
    except Exception as e:
        print(f"Error listing sessions: {e}")

asyncio.run(list_sessions())
EOF
}

kill_session() {
    log_header "Kill Backend.AI Session"
    
    if [[ -z "$1" ]]; then
        log_info "Usage: kill_session <session-name>"
        return 1
    fi
    
    SESSION_NAME="$1"
    log_info "Terminating session: $SESSION_NAME"
    
    python3 << EOF
import asyncio
from ai.backend.client.session import AsyncSession

async def kill_session():
    try:
        async with AsyncSession() as api_session:
            session = api_session.ComputeSession('$SESSION_NAME')
            await session.destroy()
            print("Session terminated successfully")
    except Exception as e:
        print(f"Error terminating session: {e}")

asyncio.run(kill_session())
EOF
}

session_logs() {
    log_header "Backend.AI Session Logs"
    
    if [[ -z "$1" ]]; then
        log_info "Usage: session_logs <session-name>"
        return 1
    fi
    
    SESSION_NAME="$1"
    log_info "Getting logs for session: $SESSION_NAME"
    
    python3 << EOF
import asyncio
from ai.backend.client.session import AsyncSession

async def get_logs():
    try:
        async with AsyncSession() as api_session:
            session = api_session.ComputeSession('$SESSION_NAME')
            logs = await session.get_logs()
            
            print("=== SESSION LOGS ===")
            print(logs)
            print("=== END LOGS ===")
            
    except Exception as e:
        print(f"Error getting logs: {e}")

asyncio.run(get_logs())
EOF
}

test_vllm_api() {
    log_header "Test vLLM API"
    
    if [[ -z "$1" ]]; then
        log_info "Usage: test_vllm_api <vllm-url>"
        log_info "Example: test_vllm_api http://localhost:8000"
        return 1
    fi
    
    VLLM_URL="$1"
    
    log_info "Testing vLLM API at: $VLLM_URL"
    
    # Test health endpoint
    log_info "Testing health endpoint..."
    if curl -s "$VLLM_URL/health" | grep -q "healthy"; then
        log_success "Health check passed"
    else
        log_error "Health check failed"
        return 1
    fi
    
    # Test models endpoint
    log_info "Testing models endpoint..."
    curl -s "$VLLM_URL/v1/models" | python3 -m json.tool
    
    # Test completion endpoint
    log_info "Testing completion endpoint..."
    curl -X POST "$VLLM_URL/v1/completions" \
      -H "Content-Type: application/json" \
      -d '{
        "model": "gpt-3.5-turbo",
        "prompt": "Hello, how are you?",
        "max_tokens": 50,
        "temperature": 0.7
      }' | python3 -m json.tool
}

# Resource monitoring
monitor_resources() {
    log_header "Resource Monitoring"
    
    log_info "GPU Usage:"
    if command -v nvidia-smi &> /dev/null; then
        nvidia-smi --query-gpu=index,name,memory.used,memory.total,utilization.gpu --format=csv
    else
        log_info "nvidia-smi not available"
    fi
    
    echo
    log_info "Backend.AI Sessions Resource Usage:"
    python3 << 'EOF'
import asyncio
from ai.backend.client.session import AsyncSession

async def monitor_sessions():
    try:
        async with AsyncSession() as api_session:
            sessions = await api_session.ComputeSession.list()
            
            print(f"{'Session':<25} {'Status':<10} {'GPU':<5} {'Memory':<8} {'CPU':<5}")
            print("-" * 60)
            
            for session in sessions:
                name = session.get('name', 'N/A')[:24]
                status = session.get('status', 'N/A')
                
                # Extract resource usage from session info
                resources = session.get('requested_slots', {})
                gpu = resources.get('cuda.device', '0')
                memory = resources.get('mem', '0')
                cpu = resources.get('cpu', '0')
                
                print(f"{name:<25} {status:<10} {gpu:<5} {memory:<8} {cpu:<5}")
                
    except Exception as e:
        print(f"Error monitoring sessions: {e}")

asyncio.run(monitor_sessions())
EOF
}

# Show menu
show_menu() {
    log_header "Backend.AI vLLM Deployment Examples & Utilities"
    
    echo "EXAMPLES:"
    echo "  1) Small Model (DialoGPT-medium)"
    echo "  2) Medium Model (Llama-2-7B)"  
    echo "  3) Large Model (Llama-2-70B with Quantization)"
    echo "  4) Private Model with HF Token"
    echo "  5) Custom Settings Example"
    echo
    echo "UTILITIES:"
    echo "  6) List Active Sessions"
    echo "  7) Kill Session"
    echo "  8) View Session Logs"
    echo "  9) Test vLLM API"
    echo " 10) Monitor Resources"
    echo
    echo "  0) Exit"
    echo
}

# Main menu
main() {
    while true; do
        show_menu
        read -p "Select an option: " choice
        echo
        
        case $choice in
            1) example_small_model ;;
            2) example_medium_model ;;
            3) example_large_model ;;
            4) example_private_model ;;
            5) example_custom_settings ;;
            6) list_sessions ;;
            7) 
                read -p "Enter session name to kill: " session_name
                kill_session "$session_name"
                ;;
            8)
                read -p "Enter session name for logs: " session_name
                session_logs "$session_name"
                ;;
            9)
                read -p "Enter vLLM URL (e.g., http://localhost:8000): " vllm_url
                test_vllm_api "$vllm_url"
                ;;
            10) monitor_resources ;;
            0) 
                log_info "Goodbye!"
                exit 0
                ;;
            *)
                log_info "Invalid option. Please try again."
                ;;
        esac
        
        echo
        read -p "Press Enter to continue..."
        echo
    done
}

# Handle command line arguments for direct utility calls
case "${1:-menu}" in
    "menu")
        main
        ;;
    "list")
        list_sessions
        ;;
    "kill")
        kill_session "$2"
        ;;
    "logs")
        session_logs "$2"
        ;;
    "test")
        test_vllm_api "$2"
        ;;
    "monitor")
        monitor_resources
        ;;
    *)
        echo "Usage: $0 [menu|list|kill <session>|logs <session>|test <url>|monitor]"
        exit 1
        ;;
esac