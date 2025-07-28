#!/bin/bash

# Backend.AI Health Checker - GPU Monitoring Examples
# Based on all-smi repository functionality

echo "=== Backend.AI Health Checker - GPU Monitoring Examples ==="
echo

# Build the health checker if not already built
if [ ! -f "target/release/backend-ai-health-checker" ]; then
    echo "Building health checker..."
    cargo build --release
    echo
fi

BINARY="./target/release/backend-ai-health-checker"

echo "1. Basic GPU Health Check (Table Format)"
echo "Command: $BINARY gpu"
echo "----------------------------------------"
$BINARY gpu
echo

echo "2. GPU Health Check with JSON Output"
echo "Command: $BINARY gpu --format json"
echo "----------------------------------------"
$BINARY gpu --format json
echo

echo "3. Detailed GPU Information"
echo "Command: $BINARY gpu --detailed"
echo "----------------------------------------"
$BINARY gpu --detailed
echo

echo "4. GPU Summary Format"
echo "Command: $BINARY gpu --format summary"
echo "----------------------------------------"
$BINARY gpu --format summary
echo

echo "5. Complete Health Check (includes GPU)"
echo "Command: $BINARY all"
echo "----------------------------------------"
$BINARY all
echo

echo "6. Monitoring Mode (includes GPU checks every 30 seconds)"
echo "Command: $BINARY monitor --interval 30 --max-checks 3"
echo "----------------------------------------"
echo "Running 3 monitoring cycles..."
$BINARY monitor --interval 10 --max-checks 3
echo

echo "=== GPU Monitoring Examples Complete ==="
echo
echo "Available GPU monitoring commands:"
echo "  $BINARY gpu                    # Basic GPU health check"
echo "  $BINARY gpu --detailed         # Detailed GPU information"
echo "  $BINARY gpu --format json      # JSON output for automation"
echo "  $BINARY gpu --format summary   # Compact summary format"
echo "  $BINARY all                    # All checks including GPU"
echo "  $BINARY monitor                # Continuous monitoring with GPU"