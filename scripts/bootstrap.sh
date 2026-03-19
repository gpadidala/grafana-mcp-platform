#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# bootstrap.sh — One-shot cluster bootstrap
# Installs: cert-manager, External Secrets Operator, ArgoCD, Kyverno
# Usage: bash scripts/bootstrap.sh [--env dev|perf|prod]
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

ENV=${1:-dev}
ARGOCD_VERSION=v2.11.3
CERT_MANAGER_VERSION=v1.15.1
ESO_VERSION=0.10.3
KYVERNO_VERSION=3.2.4

echo "🚀 Bootstrapping cluster for environment: $ENV"

# ── Namespaces ────────────────────────────────────────────────────
for ns in dev stage prod argocd cert-manager external-secrets kyverno monitoring; do
  kubectl create namespace "$ns" --dry-run=client -o yaml | kubectl apply -f -
done

# ── cert-manager ──────────────────────────────────────────────────
echo "📜 Installing cert-manager $CERT_MANAGER_VERSION..."
helm repo add jetstack https://charts.jetstack.io --force-update
helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --version "$CERT_MANAGER_VERSION" \
  --set installCRDs=true \
  --wait --timeout 5m

# Apply ClusterIssuers
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    email: platform@your-org.com  # TODO
    privateKeySecretRef:
      name: letsencrypt-staging
    solvers:
      - http01:
          ingress:
            class: nginx
---
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: platform@your-org.com  # TODO
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
EOF

# ── External Secrets Operator ─────────────────────────────────────
echo "🔐 Installing External Secrets Operator v$ESO_VERSION..."
helm repo add external-secrets https://charts.external-secrets.io --force-update
helm upgrade --install external-secrets external-secrets/external-secrets \
  --namespace external-secrets \
  --version "$ESO_VERSION" \
  --set installCRDs=true \
  --wait --timeout 5m

# ── Kyverno ───────────────────────────────────────────────────────
echo "🛡️  Installing Kyverno v$KYVERNO_VERSION..."
helm repo add kyverno https://kyverno.github.io/kyverno/ --force-update
helm upgrade --install kyverno kyverno/kyverno \
  --namespace kyverno \
  --version "$KYVERNO_VERSION" \
  --set admissionController.replicas=3 \
  --wait --timeout 5m

# Apply Kyverno policies
kubectl apply -f k8s/kyverno-policies.yaml

# ── ArgoCD ────────────────────────────────────────────────────────
echo "🔄 Installing ArgoCD $ARGOCD_VERSION..."
helm repo add argo https://argoproj.github.io/argo-helm --force-update
helm upgrade --install argocd argo/argo-cd \
  --namespace argocd \
  --version "$(helm search repo argo/argo-cd -o json | jq -r '.[0].version')" \
  --set server.extraArgs="{--insecure}" \
  --wait --timeout 10m

# Apply AppProject and ApplicationSet
kubectl apply -f argocd/appproject.yaml
kubectl apply -f argocd/applicationset.yaml

echo ""
echo "✅ Bootstrap complete!"
echo ""
echo "ArgoCD UI:"
echo "  kubectl port-forward svc/argocd-server -n argocd 8080:443"
echo "  URL: https://localhost:8080"
ARGOCD_PASS=$(kubectl get secret argocd-initial-admin-secret -n argocd \
  -o jsonpath="{.data.password}" | base64 -d)
echo "  Password: $ARGOCD_PASS"
