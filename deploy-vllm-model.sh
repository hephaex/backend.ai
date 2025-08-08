#!/bin/bash

# Backend.AI vLLM Model Serving Automation Script
# This script automatically deploys HuggingFace models using vLLM on Backend.AI

set -e

# Script metadata
SCRIPT_VERSION="1.0.0"
SCRIPT_NAME="Backend.AI vLLM Model Server"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration defaults
DEFAULT_GPU_COUNT=1
DEFAULT_MEMORY="16g"
DEFAULT_CPU_COUNT=4
DEFAULT_MAX_MODEL_LEN=4096
DEFAULT_DTYPE="auto"
DEFAULT_TRUST_REMOTE_CODE="false"

# Backend.AI configuration
BACKEND_AI_ENDPOINT="${BACKEND_AI_ENDPOINT:-http://localhost:8081}"
BACKEND_AI_ACCESS_KEY="${BACKEND_AI_ACCESS_KEY}"
BACKEND_AI_SECRET_KEY="${BACKEND_AI_SECRET_KEY}"

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

log_debug() {
    if [[ "${DEBUG:-false}" == "true" ]]; then
        echo -e "${CYAN}[DEBUG]${NC} $1"
    fi
}

# Help function
show_help() {
    cat << EOF
${SCRIPT_NAME} v${SCRIPT_VERSION}

USAGE:
    $0 [OPTIONS] <huggingface-model-url>

DESCRIPTION:
    Automatically deploys HuggingFace models using vLLM on Backend.AI with GPU acceleration.
    
ARGUMENTS:
    <huggingface-model-url>    HuggingFace model repository URL or model name
                              Examples: 
                                - meta-llama/Llama-2-7b-chat-hf
                                - microsoft/DialoGPT-medium
                                - https://huggingface.co/microsoft/DialoGPT-medium

OPTIONS:
    -g, --gpu-count <count>        Number of GPUs (default: $DEFAULT_GPU_COUNT)
    -m, --memory <size>            Memory allocation (default: $DEFAULT_MEMORY)
    -c, --cpu-count <count>        Number of CPU cores (default: $DEFAULT_CPU_COUNT)
    -n, --session-name <name>      Custom session name (default: auto-generated)
    -p, --port <port>              vLLM server port (default: 8000)
    
    --max-model-len <length>       Maximum model sequence length (default: $DEFAULT_MAX_MODEL_LEN)
    --dtype <type>                 Data type for model weights (default: $DEFAULT_DTYPE)
    --trust-remote-code            Trust remote code in HF models (default: $DEFAULT_TRUST_REMOTE_CODE)
    --quantization <method>        Quantization method (e.g., awq, gptq, fp8)
    --tensor-parallel-size <size>  Tensor parallelism size for multi-GPU
    
    --huggingface-token <token>    HuggingFace access token for private models
    --image <image>                Custom vLLM container image
    --scaling-group <group>        Backend.AI scaling group (default: default)
    
    --wait                         Wait for deployment to complete
    --no-cleanup                   Don't cleanup on script interruption
    --dry-run                      Show what would be done without executing
    
    -v, --verbose                  Enable verbose output
    --debug                        Enable debug output
    -h, --help                     Show this help message

ENVIRONMENT VARIABLES:
    BACKEND_AI_ENDPOINT           Backend.AI API endpoint URL
    BACKEND_AI_ACCESS_KEY         Backend.AI access key
    BACKEND_AI_SECRET_KEY         Backend.AI secret key
    HUGGING_FACE_HUB_TOKEN       HuggingFace Hub access token

EXAMPLES:
    # Deploy Llama-2-7B with default settings
    $0 meta-llama/Llama-2-7b-chat-hf
    
    # Deploy with custom GPU and memory settings
    $0 -g 2 -m 32g meta-llama/Llama-2-13b-chat-hf
    
    # Deploy with quantization and custom settings
    $0 --gpu-count 4 --quantization awq --tensor-parallel-size 4 \\
       --max-model-len 8192 meta-llama/Llama-2-70b-chat-hf
    
    # Deploy private model with HF token
    $0 --huggingface-token hf_xxxxx private-org/private-model
    
    # Dry run to see configuration
    $0 --dry-run microsoft/DialoGPT-medium

For more information, visit: https://docs.backend.ai/
EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -g|--gpu-count)
                GPU_COUNT="$2"
                shift 2
                ;;
            -m|--memory)
                MEMORY="$2"
                shift 2
                ;;
            -c|--cpu-count)
                CPU_COUNT="$2"
                shift 2
                ;;
            -n|--session-name)
                SESSION_NAME="$2"
                shift 2
                ;;
            -p|--port)
                VLLM_PORT="$2"
                shift 2
                ;;
            --max-model-len)
                MAX_MODEL_LEN="$2"
                shift 2
                ;;
            --dtype)
                DTYPE="$2"
                shift 2
                ;;
            --trust-remote-code)
                TRUST_REMOTE_CODE="true"
                shift
                ;;
            --quantization)
                QUANTIZATION="$2"
                shift 2
                ;;
            --tensor-parallel-size)
                TENSOR_PARALLEL_SIZE="$2"
                shift 2
                ;;
            --huggingface-token)
                HUGGINGFACE_TOKEN="$2"
                shift 2
                ;;
            --image)
                VLLM_IMAGE="$2"
                shift 2
                ;;
            --scaling-group)
                SCALING_GROUP="$2"
                shift 2
                ;;
            --wait)
                WAIT_FOR_COMPLETION="true"
                shift
                ;;
            --no-cleanup)
                NO_CLEANUP="true"
                shift
                ;;
            --dry-run)
                DRY_RUN="true"
                shift
                ;;
            -v|--verbose)
                VERBOSE="true"
                shift
                ;;
            --debug)
                DEBUG="true"
                VERBOSE="true"
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            -*)
                log_error "Unknown option: $1"
                echo "Use --help for usage information."
                exit 1
                ;;
            *)
                if [[ -z "$HF_MODEL_URL" ]]; then
                    HF_MODEL_URL="$1"
                else
                    log_error "Multiple model URLs specified: '$HF_MODEL_URL' and '$1'"
                    exit 1
                fi
                shift
                ;;
        esac
    done
    
    # Validate required arguments
    if [[ -z "$HF_MODEL_URL" ]]; then
        log_error "HuggingFace model URL is required"
        echo "Use --help for usage information."
        exit 1
    fi
}

# Set defaults after parsing
set_defaults() {
    GPU_COUNT="${GPU_COUNT:-$DEFAULT_GPU_COUNT}"
    MEMORY="${MEMORY:-$DEFAULT_MEMORY}"
    CPU_COUNT="${CPU_COUNT:-$DEFAULT_CPU_COUNT}"
    MAX_MODEL_LEN="${MAX_MODEL_LEN:-$DEFAULT_MAX_MODEL_LEN}"
    DTYPE="${DTYPE:-$DEFAULT_DTYPE}"
    TRUST_REMOTE_CODE="${TRUST_REMOTE_CODE:-$DEFAULT_TRUST_REMOTE_CODE}"
    VLLM_PORT="${VLLM_PORT:-8000}"
    VLLM_IMAGE="${VLLM_IMAGE:-vllm/vllm-openai:latest}"
    SCALING_GROUP="${SCALING_GROUP:-default}"
    WAIT_FOR_COMPLETION="${WAIT_FOR_COMPLETION:-false}"
    NO_CLEANUP="${NO_CLEANUP:-false}"
    DRY_RUN="${DRY_RUN:-false}"
    VERBOSE="${VERBOSE:-false}"
    DEBUG="${DEBUG:-false}"
    
    # Auto-generate session name if not provided
    if [[ -z "$SESSION_NAME" ]]; then
        MODEL_NAME=$(basename "$HF_MODEL_URL")
        MODEL_NAME=${MODEL_NAME//[^a-zA-Z0-9-]/-}  # Replace special chars with hyphens
        TIMESTAMP=$(date +%Y%m%d-%H%M%S)
        SESSION_NAME="vllm-${MODEL_NAME}-${TIMESTAMP}"
    fi
    
    # Use environment token if not provided via argument
    HUGGINGFACE_TOKEN="${HUGGINGFACE_TOKEN:-$HUGGING_FACE_HUB_TOKEN}"
}

# Validate configuration
validate_config() {
    log_debug "Validating configuration..."
    
    # Check Backend.AI credentials
    if [[ -z "$BACKEND_AI_ACCESS_KEY" || -z "$BACKEND_AI_SECRET_KEY" ]]; then
        log_error "Backend.AI credentials are required"
        log_info "Please set BACKEND_AI_ACCESS_KEY and BACKEND_AI_SECRET_KEY environment variables"
        exit 1
    fi
    
    # Validate GPU count
    if ! [[ "$GPU_COUNT" =~ ^[1-9][0-9]*$ ]]; then
        log_error "GPU count must be a positive integer: $GPU_COUNT"
        exit 1
    fi
    
    # Validate memory format
    if ! [[ "$MEMORY" =~ ^[0-9]+[mgMG]$ ]]; then
        log_error "Memory must be in format like '16g' or '32G': $MEMORY"
        exit 1
    fi
    
    # Validate CPU count
    if ! [[ "$CPU_COUNT" =~ ^[1-9][0-9]*$ ]]; then
        log_error "CPU count must be a positive integer: $CPU_COUNT"
        exit 1
    fi
    
    # Check if model URL is valid
    if [[ "$HF_MODEL_URL" =~ ^https?:// ]]; then
        # Extract model name from full URL
        MODEL_REPO=$(echo "$HF_MODEL_URL" | sed -E 's|https?://huggingface\.co/||' | sed 's|/.*||')
        if [[ -z "$MODEL_REPO" ]]; then
            log_error "Cannot extract model repository from URL: $HF_MODEL_URL"
            exit 1
        fi
        HF_MODEL_URL="$MODEL_REPO"
    fi
    
    log_debug "Configuration validation completed"
}

# Check dependencies
check_dependencies() {
    log_debug "Checking dependencies..."
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        log_error "Python 3 is required but not installed"
        exit 1
    fi
    
    # Check Backend.AI client
    if ! python3 -c "import ai.backend.client" 2>/dev/null; then
        log_error "Backend.AI client SDK is not installed"
        log_info "Install with: pip install backend.ai-client"
        exit 1
    fi
    
    log_debug "Dependencies check completed"
}

# Show configuration
show_config() {
    log_header "vLLM Deployment Configuration"
    
    echo -e "${CYAN}Model Configuration:${NC}"
    echo "  HuggingFace Model: $HF_MODEL_URL"
    echo "  Session Name: $SESSION_NAME"
    echo "  Container Image: $VLLM_IMAGE"
    echo "  Scaling Group: $SCALING_GROUP"
    echo
    
    echo -e "${CYAN}Resource Allocation:${NC}"
    echo "  GPU Count: $GPU_COUNT"
    echo "  Memory: $MEMORY"
    echo "  CPU Cores: $CPU_COUNT"
    echo
    
    echo -e "${CYAN}vLLM Configuration:${NC}"
    echo "  Port: $VLLM_PORT"
    echo "  Max Model Length: $MAX_MODEL_LEN"
    echo "  Data Type: $DTYPE"
    echo "  Trust Remote Code: $TRUST_REMOTE_CODE"
    
    [[ -n "$QUANTIZATION" ]] && echo "  Quantization: $QUANTIZATION"
    [[ -n "$TENSOR_PARALLEL_SIZE" ]] && echo "  Tensor Parallel Size: $TENSOR_PARALLEL_SIZE"
    [[ -n "$HUGGINGFACE_TOKEN" ]] && echo "  HuggingFace Token: ${HUGGINGFACE_TOKEN:0:8}..."
    
    echo
    echo -e "${CYAN}Backend.AI Settings:${NC}"
    echo "  Endpoint: $BACKEND_AI_ENDPOINT"
    echo "  Access Key: ${BACKEND_AI_ACCESS_KEY:0:8}..."
    echo
}

# Create Python deployment script
create_deployment_script() {
    log_debug "Creating Python deployment script..."
    
    PYTHON_SCRIPT="/tmp/deploy_vllm_${SESSION_NAME}.py"
    
    cat > "$PYTHON_SCRIPT" << EOF
#!/usr/bin/env python3

import asyncio
import json
import sys
import time
from typing import Dict, Any, Optional

from ai.backend.client.session import AsyncSession
from ai.backend.client.config import APIConfig
from ai.backend.client.exceptions import BackendAPIError

# Configuration
CONFIG = {
    "hf_model_url": "$HF_MODEL_URL",
    "session_name": "$SESSION_NAME",
    "gpu_count": "$GPU_COUNT",
    "memory": "$MEMORY",
    "cpu_count": "$CPU_COUNT",
    "vllm_port": "$VLLM_PORT",
    "vllm_image": "$VLLM_IMAGE",
    "scaling_group": "$SCALING_GROUP",
    "max_model_len": "$MAX_MODEL_LEN",
    "dtype": "$DTYPE",
    "trust_remote_code": "$TRUST_REMOTE_CODE",
    "quantization": "${QUANTIZATION:-}",
    "tensor_parallel_size": "${TENSOR_PARALLEL_SIZE:-}",
    "huggingface_token": "${HUGGINGFACE_TOKEN:-}",
    "wait_for_completion": "$WAIT_FOR_COMPLETION" == "true",
    "verbose": "$VERBOSE" == "true",
    "debug": "$DEBUG" == "true"
}

def log_info(msg: str):
    print(f"\033[0;34m[INFO]\033[0m {msg}")

def log_success(msg: str):
    print(f"\033[0;32m[SUCCESS]\033[0m {msg}")

def log_warning(msg: str):
    print(f"\033[1;33m[WARNING]\033[0m {msg}")

def log_error(msg: str):
    print(f"\033[0;31m[ERROR]\033[0m {msg}")

def log_debug(msg: str):
    if CONFIG["debug"]:
        print(f"\033[0;36m[DEBUG]\033[0m {msg}")

def build_vllm_command() -> str:
    """Build vLLM command with all parameters."""
    cmd_parts = [
        "python", "-m", "vllm.entrypoints.openai.api_server",
        "--model", CONFIG["hf_model_url"],
        "--host", "0.0.0.0",
        "--port", str(CONFIG["vllm_port"]),
        "--max-model-len", str(CONFIG["max_model_len"]),
        "--dtype", CONFIG["dtype"]
    ]
    
    if CONFIG["trust_remote_code"] == "true":
        cmd_parts.append("--trust-remote-code")
    
    if CONFIG["quantization"]:
        cmd_parts.extend(["--quantization", CONFIG["quantization"]])
    
    if CONFIG["tensor_parallel_size"]:
        cmd_parts.extend(["--tensor-parallel-size", CONFIG["tensor_parallel_size"]])
    
    return " ".join(cmd_parts)

def build_environment() -> Dict[str, str]:
    """Build environment variables for the session."""
    env = {
        "MODEL_NAME": CONFIG["hf_model_url"],
        "VLLM_HOST": "0.0.0.0",
        "VLLM_PORT": str(CONFIG["vllm_port"]),
        "CUDA_VISIBLE_DEVICES": ",".join(map(str, range(int(CONFIG["gpu_count"])))),
    }
    
    if CONFIG["huggingface_token"]:
        env["HUGGING_FACE_HUB_TOKEN"] = CONFIG["huggingface_token"]
    
    return env

def build_resources() -> Dict[str, str]:
    """Build resource specification."""
    resources = {
        "cpu": CONFIG["cpu_count"],
        "mem": CONFIG["memory"],
        "cuda.device": CONFIG["gpu_count"]
    }
    
    # Calculate GPU shares (1 share per GPU)
    gpu_shares = float(CONFIG["gpu_count"])
    resources["cuda.shares"] = str(gpu_shares)
    
    return resources

async def wait_for_session_ready(session, timeout: int = 300) -> bool:
    """Wait for session to be ready."""
    log_info("Waiting for session to be ready...")
    
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            info = await session.get_info()
            status = info.get("status", "").upper()
            
            log_debug(f"Session status: {status}")
            
            if status == "RUNNING":
                log_success("Session is running!")
                return True
            elif status in ["TERMINATED", "CANCELLED", "ERROR"]:
                log_error(f"Session failed with status: {status}")
                return False
            
            await asyncio.sleep(5)
        except Exception as e:
            log_debug(f"Error checking session status: {e}")
            await asyncio.sleep(5)
    
    log_warning(f"Session not ready after {timeout} seconds")
    return False

async def get_service_url(session) -> Optional[str]:
    """Get the service URL for the vLLM server."""
    try:
        info = await session.get_info()
        service_ports = info.get("service_ports", [])
        
        for port_info in service_ports:
            if port_info.get("name") == "vllm" or str(CONFIG["vllm_port"]) in str(port_info.get("container_ports", [])):
                host_ports = port_info.get("host_ports", [])
                if host_ports:
                    # Assume first host port is accessible
                    return f"http://localhost:{host_ports[0]}"
        
        log_warning("vLLM service port not found in session info")
        return None
        
    except Exception as e:
        log_error(f"Error getting service URL: {e}")
        return None

async def deploy_vllm_model():
    """Main deployment function."""
    try:
        # Initialize Backend.AI session
        config = APIConfig(
            endpoint="$BACKEND_AI_ENDPOINT",
            access_key="$BACKEND_AI_ACCESS_KEY",
            secret_key="$BACKEND_AI_SECRET_KEY"
        )
        
        async with AsyncSession(config=config) as api_session:
            log_info(f"Creating vLLM session: {CONFIG['session_name']}")
            
            # Build session parameters
            vllm_cmd = build_vllm_command()
            environment = build_environment()
            resources = build_resources()
            
            log_debug(f"vLLM command: {vllm_cmd}")
            log_debug(f"Environment: {environment}")
            log_debug(f"Resources: {resources}")
            
            # Create compute session
            session = await api_session.ComputeSession.get_or_create(
                image=CONFIG["vllm_image"],
                name=CONFIG["session_name"],
                type_="inference",
                resources=resources,
                envs=environment,
                startup_command=vllm_cmd,
                scaling_group=CONFIG["scaling_group"]
            )
            
            session_id = session.kernel_id if hasattr(session, 'kernel_id') else 'unknown'
            log_success(f"Session created successfully: {session_id}")
            
            # Wait for session to be ready if requested
            if CONFIG["wait_for_completion"]:
                if await wait_for_session_ready(session):
                    service_url = await get_service_url(session)
                    if service_url:
                        log_success(f"vLLM server is ready at: {service_url}")
                        log_info("API endpoints:")
                        log_info(f"  - Health check: {service_url}/health")
                        log_info(f"  - Models: {service_url}/v1/models")
                        log_info(f"  - Chat completions: {service_url}/v1/chat/completions")
                        log_info(f"  - Completions: {service_url}/v1/completions")
                    else:
                        log_warning("Could not determine service URL")
                else:
                    log_error("Session failed to become ready")
                    return 1
            else:
                log_info("Session created. Use --wait to wait for completion.")
            
            # Output session info
            session_info = {
                "session_id": session_id,
                "session_name": CONFIG["session_name"],
                "model": CONFIG["hf_model_url"],
                "resources": resources,
                "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
            }
            
            print("\n" + "="*60)
            print("SESSION INFORMATION")
            print("="*60)
            print(json.dumps(session_info, indent=2))
            print("="*60)
            
            return 0
            
    except BackendAPIError as e:
        log_error(f"Backend.AI API error: {e}")
        return 1
    except Exception as e:
        log_error(f"Deployment failed: {e}")
        if CONFIG["debug"]:
            import traceback
            traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(deploy_vllm_model())
    sys.exit(exit_code)
EOF
    
    chmod +x "$PYTHON_SCRIPT"
    log_debug "Python deployment script created: $PYTHON_SCRIPT"
}

# Deploy the model
deploy_model() {
    log_header "Deploying vLLM Model"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Would create vLLM deployment with the above configuration"
        return 0
    fi
    
    create_deployment_script
    
    log_info "Starting deployment..."
    
    # Run the Python deployment script
    if python3 "$PYTHON_SCRIPT"; then
        log_success "vLLM model deployment completed successfully!"
        
        if [[ "$WAIT_FOR_COMPLETION" == "true" ]]; then
            log_info "Model is ready for inference requests"
        else
            log_info "Model deployment initiated. Check Backend.AI console for status."
        fi
        
        return 0
    else
        log_error "Deployment failed"
        return 1
    fi
}

# Cleanup function
cleanup() {
    log_debug "Cleaning up..."
    
    # Remove temporary Python script
    if [[ -f "$PYTHON_SCRIPT" && "$NO_CLEANUP" != "true" ]]; then
        rm -f "$PYTHON_SCRIPT"
        log_debug "Temporary script removed: $PYTHON_SCRIPT"
    fi
}

# Signal handlers
trap cleanup EXIT
trap 'log_warning "Script interrupted by user"; exit 130' INT TERM

# Main function
main() {
    log_header "$SCRIPT_NAME v$SCRIPT_VERSION"
    
    parse_args "$@"
    set_defaults
    validate_config
    check_dependencies
    
    if [[ "$VERBOSE" == "true" ]]; then
        show_config
    fi
    
    if deploy_model; then
        log_success "Script completed successfully"
        exit 0
    else
        log_error "Script failed"
        exit 1
    fi
}

# Run main function with all arguments
main "$@"