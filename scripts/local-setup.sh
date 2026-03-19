#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# local-setup.sh — Set up local kind cluster for development
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

echo "🔧 Setting up local kind cluster..."

# Install nginx ingress for kind
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

# Wait for ingress controller
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=90s

# Create a local image pull secret (not needed for local builds)
# kubectl create secret docker-registry regcred -n dev ...

# Install cert-manager (minimal, for local TLS)
helm repo add jetstack https://charts.jetstack.io --force-update
helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace \
  --set installCRDs=true \
  --wait --timeout 5m

echo "✅ Local cluster ready"
echo "   Import local images: kind load docker-image <image> --name grafana-mcp-local"
