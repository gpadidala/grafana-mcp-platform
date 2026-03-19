# Grafana MCP Platform

> AI-powered Grafana observability assistant via Model Context Protocol.
> Chat with your dashboards, metrics, logs, alerts, and traces using any LLM.

---

## Quick Start (Local)

```bash
# 1. Clone and configure
git clone https://github.com/your-org/grafana-mcp-platform  # TODO: set your repo
cd grafana-mcp-platform
cp .env.example .env
# Edit .env — at minimum set OPENAI_API_KEY and GRAFANA_API_KEY

# 2. Start the full stack
make local-up

# 3. Open the chat UI
open http://localhost:3001
```

**URLs after `make local-up`:**

| Service | URL | Credentials |
|---------|-----|-------------|
| Chat UI | http://localhost:3001 | (API key from `.env`) |
| FastAPI docs | http://localhost:8000/docs | — |
| Grafana | http://localhost:3000 | admin / admin |
| Prometheus | http://localhost:9090 | — |
| MCP Server | http://localhost:8080/sse | — |

---

## Prerequisites

- Docker 24+ and Docker Compose v2
- `make`
- For K8s local: `kind` + `kubectl` + `helm`
- For cloud deployment: `aws`/`az`/`gcloud` CLI + Terraform 1.8+

---

## LLM Provider Configuration

Set the appropriate env vars in `.env`:

| Provider | Required Env Vars | Notes |
|----------|------------------|-------|
| **OpenAI** | `OPENAI_API_KEY` | Default provider |
| **Anthropic** | `ANTHROPIC_API_KEY` | Claude models |
| **Azure OpenAI** | `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT` | Enterprise |
| **Google Gemini** | `GOOGLE_API_KEY` | Gemini 1.5 Pro/Flash |
| **Ollama** | `OLLAMA_BASE_URL` | Local LLM (`make local-up-ollama`) |
| **OpenAI-compatible** | `OPENAI_COMPATIBLE_BASE_URL`, `OPENAI_COMPATIBLE_API_KEY` | vLLM, LM Studio, LiteLLM |

Switch providers in the UI via the **Change LLM** dropdown in the top bar.

---

## Environment Matrix

| Environment | Cloud | Namespace | Cluster | Auto-deploy |
|-------------|-------|-----------|---------|-------------|
| DEV | AKS | `dev` | `dev-aks` | ✅ On push to `main` |
| PERF | GKE | `stage` | `perf-gke` | ✅ On push to `release/*` |
| PROD | EKS | `prod` | `prod-eks` | 🔒 Manual approval only |

---

## Make Targets

| Target | Description |
|--------|-------------|
| `make local-up` | Start full local Docker Compose stack |
| `make local-up-ollama` | Start stack + Ollama local LLM |
| `make local-down` | Stop and remove all containers + volumes |
| `make local-logs` | Tail backend + mcp-server logs |
| `make local-k8s-up` | Deploy to local kind cluster |
| `make build-all` | Build all 3 Docker images |
| `make push-all` | Push all images to registry |
| `make test` | Run all tests (backend + frontend + helm) |
| `make lint` | Run all linters |
| `make format` | Auto-format Python + TypeScript code |
| `make deploy-dev` | Helm deploy to DEV cluster |
| `make deploy-perf` | Helm deploy to PERF cluster |
| `make deploy-prod` | Helm deploy to PROD (requires `CONFIRM=yes`) |
| `make bootstrap` | Bootstrap a new cluster (cert-manager, ESO, ArgoCD, Kyverno) |
| `make rotate-secrets` | Rotate secrets in cloud key vault |
| `make open-ui` | Open Chat UI in browser |
| `make open-grafana` | Open Grafana in browser |
| `make open-api-docs` | Open FastAPI Swagger docs |

---

## Project Structure

```
grafana-mcp-platform/
├── frontend/           React + TypeScript chat UI
├── backend/            Python FastAPI LLM gateway + MCP proxy
├── mcp-server/         Grafana MCP Server Dockerfile (Go binary)
├── helm/               Kubernetes Helm chart (all 3 components)
├── terraform/          IaC for AKS, GKE, EKS
├── argocd/             GitOps ApplicationSet
├── docker/             Docker Compose + local configs
├── .github/workflows/  CI/CD pipelines
├── scripts/            Bootstrap, local-setup, secret rotation
└── docs/               Architecture, LLM provider guide, security
```

---

## Deploying to Kubernetes

### 1. Bootstrap the cluster
```bash
# Point kubectl at your cluster first
bash scripts/bootstrap.sh
```

### 2. Set secrets in your cloud KV
```bash
# AWS example
aws secretsmanager create-secret --name grafana-mcp/openai-api-key \
  --secret-string "sk-..."

# Azure example
az keyvault secret set --vault-name grafana-mcp-dev --name openai-api-key \
  --value "sk-..."
```

### 3. Deploy
```bash
make deploy-dev    # DEV
make deploy-perf   # PERF
CONFIRM=yes make deploy-prod  # PROD (after approval)
```

---

## Architecture

See [docs/architecture.md](docs/architecture.md) for:
- Full system diagram (Mermaid)
- Chat request + agentic loop flow
- CI/CD pipeline diagram
- Secret management flow
- Network policy diagram
- Security threat model

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `MCP server not available` | Check `docker compose logs mcp-server`. Ensure `GRAFANA_API_KEY` is set. |
| `401 Unauthorized` from API | Set `VITE_API_KEY` in frontend `.env` to match `API_KEY_SECRET` in backend `.env`. |
| LLM returns `Invalid API key` | Check the provider's API key env var in `.env`. |
| Frontend shows `Loading tools...` forever | Backend is unreachable or MCP server hasn't started. Check `make local-logs`. |
| `Helm lint` fails in CI | Run `make test-helm` locally to debug. |
| ArgoCD not syncing | Run `argocd app sync mcp-dev` manually. Check for Kyverno policy violations in Events. |

---

## Security

- All secrets managed via External Secrets Operator — never in git
- Images signed with cosign (keyless, GitHub OIDC)
- Kyverno policies enforce: non-root, no latest tag, resource limits, no hostPath
- Network policies: default-deny with explicit allow-only rules
- Container security: distroless / slim images, read-only filesystem, no capabilities

See [docs/security.md](docs/security.md) for the full threat model.

---

## References

- [grafana/mcp-grafana](https://github.com/grafana/mcp-grafana) — official Grafana MCP server
- [aws-samples/sample-grafana-remote-mcp](https://github.com/aws-samples/sample-grafana-remote-mcp) — OAuth2.1 remote MCP pattern
- [grafana/grafana-mcp-agent-datasource](https://github.com/grafana/grafana-mcp-agent-datasource) — React MCPClientProvider pattern
- [Grafana LLM + MCP docs](https://grafana.com/docs/grafana-cloud/machine-learning/assistant/configure/mcp-servers/)
- [Model Context Protocol spec](https://spec.modelcontextprotocol.io/)
