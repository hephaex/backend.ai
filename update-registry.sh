#!/bin/bash
CHARTS=("backend-ai-manager-helm" "backend-ai-agent-helm" "backend-ai-storage-proxy-helm" 
        "backend-ai-app-proxy-helm" "backend-ai-web-server-helm")

for chart in "${CHARTS[@]}"; do
    if [ -f "$chart/values.yaml" ]; then
        echo "Updating $chart/values.yaml..."
        
        # Update registry settings
        sed -i.bak 's|registry: localhost:5000|registry: localhost:30002|g' "$chart/values.yaml"
        sed -i.bak 's|repository: backend.ai-|repository: backend-ai/|g' "$chart/values.yaml"
        
        # Add imagePullSecrets if not present
        if ! grep -q "imagePullSecrets" "$chart/values.yaml"; then
            echo "" >> "$chart/values.yaml"
            echo "imagePullSecrets:" >> "$chart/values.yaml"
            echo "  - name: harbor-registry-secret" >> "$chart/values.yaml"
        fi
        
        echo "✅ Updated $chart/values.yaml"
    else
        echo "❌ $chart/values.yaml not found"
    fi
done

echo "Registry update completed!"