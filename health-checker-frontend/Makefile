# Backend.AI Health Checker Frontend Makefile

# Variables
FRONTEND_DIR = .
SERVER_DIR = server
BUILD_DIR = build
HEALTH_CHECKER_BIN = ../health-checker/target/release/backend-ai-health-checker

.PHONY: all install build dev start clean help server-dev

# Default target
all: install build

# Install all dependencies
install:
	@echo "Installing frontend dependencies..."
	npm install
	@echo "Installing server dependencies..."
	cd $(SERVER_DIR) && npm install
	@echo "Dependencies installed successfully!"

# Install only production dependencies
install-prod:
	@echo "Installing production dependencies..."
	npm ci --only=production
	cd $(SERVER_DIR) && npm ci --only=production

# Build React application
build:
	@echo "Building React application..."
	npm run build
	@echo "Build completed! Output in $(BUILD_DIR)/"

# Start development servers
dev:
	@echo "Starting development environment..."
	@echo "Starting API server in background..."
	cd $(SERVER_DIR) && npm run dev &
	@echo "Waiting for API server to start..."
	sleep 3
	@echo "Starting React development server..."
	npm start

# Start production server
start: build
	@echo "Starting production server..."
	cd $(SERVER_DIR) && npm start

# Start only the API server for development
server-dev:
	@echo "Starting API server in development mode..."
	cd $(SERVER_DIR) && npm run dev

# Start only the React development server
frontend-dev:
	@echo "Starting React development server..."
	npm start

# Test the application
test:
	@echo "Running tests..."
	npm test

# Lint the code
lint:
	@echo "Linting code..."
	npm run lint || echo "Linting completed with warnings"

# Format code
format:
	@echo "Formatting code..."
	npx prettier --write "src/**/*.{ts,tsx,js,jsx,css,md}"

# Clean build artifacts and dependencies
clean:
	@echo "Cleaning build artifacts..."
	rm -rf $(BUILD_DIR)
	rm -rf node_modules
	rm -rf $(SERVER_DIR)/node_modules
	@echo "Clean completed!"

# Check if health checker binary exists
check-health-checker:
	@if [ ! -f "$(HEALTH_CHECKER_BIN)" ]; then \
		echo "Error: Health checker binary not found at $(HEALTH_CHECKER_BIN)"; \
		echo "Please build it first with: cd ../health-checker && cargo build --release"; \
		exit 1; \
	else \
		echo "Health checker binary found: $(HEALTH_CHECKER_BIN)"; \
	fi

# Install and setup everything
setup: check-health-checker install
	@echo "Setup completed! You can now run:"
	@echo "  make dev    # Start development servers"
	@echo "  make start  # Start production server"

# Create a production deployment package
package: build
	@echo "Creating deployment package..."
	@mkdir -p dist
	@cp -r $(BUILD_DIR) dist/
	@cp -r $(SERVER_DIR) dist/
	@cp $(HEALTH_CHECKER_BIN) dist/server/ || echo "Warning: Health checker binary not found"
	@echo "Deployment package created in dist/"

# Quick development cycle
quick-dev:
	@echo "Quick development setup..."
	@if [ ! -d "node_modules" ]; then \
		echo "Installing dependencies..."; \
		make install; \
	fi
	@make dev

# Health check for the setup
health-check: check-health-checker
	@echo "Checking frontend setup..."
	@if [ ! -d "node_modules" ]; then \
		echo "❌ Frontend dependencies not installed"; \
	else \
		echo "✅ Frontend dependencies installed"; \
	fi
	@if [ ! -d "$(SERVER_DIR)/node_modules" ]; then \
		echo "❌ Server dependencies not installed"; \
	else \
		echo "✅ Server dependencies installed"; \
	fi
	@if [ -f "$(HEALTH_CHECKER_BIN)" ]; then \
		echo "✅ Health checker binary available"; \
	else \
		echo "❌ Health checker binary not found"; \
	fi

# Docker build
docker-build:
	@echo "Building Docker image..."
	docker build -t backend-ai-health-frontend .

# Docker run
docker-run:
	@echo "Running Docker container..."
	docker run -p 8080:8080 backend-ai-health-frontend

# Help target
help:
	@echo "Backend.AI Health Checker Frontend Makefile"
	@echo ""
	@echo "Available targets:"
	@echo "  install        Install all dependencies (frontend + server)"
	@echo "  install-prod   Install only production dependencies"
	@echo "  build          Build React application for production"
	@echo "  dev            Start both frontend and server in development mode"
	@echo "  start          Start production server (builds first)"
	@echo "  server-dev     Start only API server in development mode"
	@echo "  frontend-dev   Start only React development server"
	@echo "  test           Run tests"
	@echo "  lint           Lint code"
	@echo "  format         Format code with Prettier"
	@echo "  clean          Remove build artifacts and dependencies"
	@echo "  setup          Complete setup (check binary + install)"
	@echo "  package        Create deployment package"
	@echo "  quick-dev      Quick start for development"
	@echo "  health-check   Check setup status"
	@echo "  docker-build   Build Docker image"
	@echo "  docker-run     Run Docker container"
	@echo "  help           Show this help message"
	@echo ""
	@echo "Development workflow:"
	@echo "  1. make setup          # First time setup"
	@echo "  2. make dev            # Start development"
	@echo "  3. make build          # Build for production"
	@echo "  4. make start          # Run production server"
	@echo ""
	@echo "Quick commands:"
	@echo "  make quick-dev         # Quick development start"
	@echo "  make health-check      # Verify setup"