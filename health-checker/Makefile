# Backend.AI Health Checker Makefile

BINARY_NAME = backend-ai-health-checker
TARGET = target/release/$(BINARY_NAME)
SOURCE_FILES = $(shell find src -name "*.rs") Cargo.toml

.PHONY: all build clean test run install help

# Default target
all: build

# Build the release binary
build: $(TARGET)

$(TARGET): $(SOURCE_FILES)
	@echo "Building $(BINARY_NAME)..."
	cargo build --release
	@echo "Binary built at: $(TARGET)"

# Build debug version (faster compilation)
debug:
	@echo "Building debug version..."
	cargo build
	@echo "Debug binary built at: target/debug/$(BINARY_NAME)"

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	cargo clean

# Run tests
test:
	@echo "Running tests..."
	cargo test

# Run with default settings (all checks, table format)
run: build
	@echo "Running health check..."
	./$(TARGET) all

# Run monitoring mode
monitor: build
	@echo "Starting monitoring mode..."
	./$(TARGET) monitor --interval 30

# Check code formatting
fmt:
	@echo "Checking code formatting..."
	cargo fmt --check

# Format code
fmt-fix:
	@echo "Formatting code..."
	cargo fmt

# Run clippy linting
clippy:
	@echo "Running clippy lints..."
	cargo clippy -- -D warnings

# Run all quality checks
check: fmt clippy test
	@echo "All quality checks passed!"

# Install binary to system PATH
install: build
	@echo "Installing $(BINARY_NAME) to /usr/local/bin/"
	sudo cp $(TARGET) /usr/local/bin/
	@echo "$(BINARY_NAME) installed successfully!"

# Install binary to user's local bin
install-user: build
	@echo "Installing $(BINARY_NAME) to ~/.local/bin/"
	@mkdir -p ~/.local/bin
	cp $(TARGET) ~/.local/bin/
	@echo "$(BINARY_NAME) installed to ~/.local/bin/"
	@echo "Make sure ~/.local/bin is in your PATH"

# Uninstall from system
uninstall:
	@echo "Removing $(BINARY_NAME) from /usr/local/bin/"
	sudo rm -f /usr/local/bin/$(BINARY_NAME)

# Uninstall from user local
uninstall-user:
	@echo "Removing $(BINARY_NAME) from ~/.local/bin/"
	rm -f ~/.local/bin/$(BINARY_NAME)

# Create distribution package
dist: build
	@echo "Creating distribution package..."
	@mkdir -p dist
	cp $(TARGET) dist/
	cp README.md dist/
	cp -r examples dist/ || true
	tar -czf dist/$(BINARY_NAME)-$(shell uname -s)-$(shell uname -m).tar.gz -C dist .
	@echo "Distribution package created: dist/$(BINARY_NAME)-$(shell uname -s)-$(shell uname -m).tar.gz"

# Development helpers
dev-deps:
	@echo "Installing development dependencies..."
	rustup component add rustfmt clippy

# Quick development cycle
dev: fmt-fix clippy test build
	@echo "Development cycle complete!"

# Benchmark the health checker
bench: build
	@echo "Running performance benchmark..."
	time ./$(TARGET) all --format json > /dev/null
	@echo "Benchmark completed!"

# Run health check examples
examples: build
	@echo "Running health check examples..."
	@echo "\n=== Table Format ==="
	./$(TARGET) all --format table
	@echo "\n=== JSON Format ==="
	./$(TARGET) all --format json | head -20
	@echo "\n=== Summary Format ==="
	./$(TARGET) all --format summary
	@echo "\n=== Docker Only ==="
	./$(TARGET) docker
	@echo "\n=== Services Only ==="
	./$(TARGET) services
	@echo "\n=== Infrastructure Only ==="
	./$(TARGET) infrastructure
	@echo "\n=== GPU Only ==="
	./$(TARGET) gpu
	@echo "\n=== GPU Detailed ==="
	./$(TARGET) gpu --detailed

# Run GPU monitoring examples
gpu-examples: build
	@echo "Running GPU monitoring examples..."
	@if [ -f "examples/gpu_monitoring.sh" ]; then \
		./examples/gpu_monitoring.sh; \
	else \
		echo "GPU examples script not found"; \
	fi

# Help target
help:
	@echo "Backend.AI Health Checker Makefile"
	@echo ""
	@echo "Available targets:"
	@echo "  build          Build release binary"
	@echo "  debug          Build debug binary (faster compilation)"
	@echo "  clean          Clean build artifacts"
	@echo "  test           Run tests"
	@echo "  run            Run health check with default settings"
	@echo "  monitor        Run in monitoring mode"
	@echo "  fmt            Check code formatting"
	@echo "  fmt-fix        Format code"
	@echo "  clippy         Run clippy linting"
	@echo "  check          Run all quality checks (fmt, clippy, test)"
	@echo "  install        Install binary to /usr/local/bin (requires sudo)"
	@echo "  install-user   Install binary to ~/.local/bin"
	@echo "  uninstall      Remove binary from /usr/local/bin"
	@echo "  uninstall-user Remove binary from ~/.local/bin"
	@echo "  dist           Create distribution package"
	@echo "  dev-deps       Install development dependencies"
	@echo "  dev            Quick development cycle (fmt, clippy, test, build)"
	@echo "  bench          Run performance benchmark"
	@echo "  examples       Run various health check examples"
	@echo "  gpu-examples   Run GPU monitoring examples"
	@echo "  help           Show this help message"
	@echo ""
	@echo "Examples:"
	@echo "  make build                    # Build release binary"
	@echo "  make run                      # Run health check"
	@echo "  make monitor                  # Start monitoring"
	@echo "  make install-user             # Install to user directory"
	@echo "  make check                    # Run all quality checks"