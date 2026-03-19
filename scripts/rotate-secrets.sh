#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# rotate-secrets.sh — Rotate secrets in cloud key vaults
# Usage: bash scripts/rotate-secrets.sh --env prod --secret grafana-api-key
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

ENV=${ENV:-dev}
SECRET_NAME=${SECRET_NAME:-grafana-api-key}
CLOUD=${CLOUD:-aws}

echo "🔄 Rotating secret: $SECRET_NAME in $CLOUD ($ENV)"

case "$CLOUD" in
  aws)
    SECRET_ARN="grafana-mcp-${ENV}/${SECRET_NAME}"
    echo "Enter new secret value (will not echo):"
    read -s NEW_VALUE
    aws secretsmanager put-secret-value \
      --secret-id "$SECRET_ARN" \
      --secret-string "$NEW_VALUE"
    echo "✅ AWS secret updated: $SECRET_ARN"
    ;;

  azure)
    VAULT_URL="${AZURE_KEYVAULT_URL}"
    az keyvault secret set --vault-name "$VAULT_URL" \
      --name "$SECRET_NAME" \
      --value "$(read -sp 'Enter new value: ' v && echo "$v")"
    echo "✅ Azure KV secret updated: $SECRET_NAME"
    ;;

  gcp)
    PROJECT="${GCP_PROJECT_ID}"
    echo "Enter new secret value (will not echo):"
    read -s NEW_VALUE
    echo -n "$NEW_VALUE" | \
      gcloud secrets versions add "grafana-mcp-${SECRET_NAME}" \
        --data-file=- \
        --project="$PROJECT"
    echo "✅ GCP Secret Manager updated: grafana-mcp-${SECRET_NAME}"
    ;;

  *)
    echo "Unknown cloud: $CLOUD (aws|azure|gcp)"
    exit 1
    ;;
esac

# Force ESO to re-sync
echo "🔄 Triggering ExternalSecret refresh..."
kubectl annotate externalsecret -n "$ENV" --all \
  force-sync="$(date +%s)" --overwrite 2>/dev/null || true

echo "✅ Secret rotation complete"
