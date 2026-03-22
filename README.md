# NovaSRE — AI Command Centre for Grafana

> A next-generation, AI-powered observability platform that puts a natural-language co-pilot on top of your entire Grafana stack. Chat with your dashboards, metrics, logs, alerts, and traces using any major LLM.

---

## What Is This?

NovaSRE is a self-hosted, full-stack AI assistant that connects to your Grafana environment via the **Model Context Protocol (MCP)** and lets you ask questions in plain English:

> *"Why is the checkout service showing a high error rate?"*
> *"Find the slowest traces in api-gateway for the last 30 minutes."*
> *"What are the top error patterns in payment service logs?"*
> *"Calculate the SLO burn rate for checkout assuming 99.9% target."*

The platform routes your question to an LLM of your choice (OpenAI, Anthropic, Azure, Gemini, or local Ollama), which then calls the MCP server to query live Grafana data — dashboards, Prometheus metrics, Loki logs, alerts, and datasources — and returns a structured, actionable answer.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (User)                           │
│           NovaSRE Chat UI — React + TypeScript                  │
│         localhost:3001  ·  Dark AI Command Centre UI            │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS / SSE streaming
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│              nginx (port 3001)                                   │
│   Serves React SPA  ·  Proxies /api/* → FastAPI backend         │
└────────────┬──────────────────────────────────┬─────────────────┘
             │ /api/*                            │ static assets
             │
┌────────────▼──────────────────────────────────────────────────┐
│              Python FastAPI Backend  (port 8000)               │
│                                                                │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │  /v1/chat   │  │  /v1/mcp     │  │  /v1/grafana       │   │
│  │  SSE stream │  │  tools list  │  │  dashboards/alerts │   │
│  └──────┬──────┘  └──────┬───────┘  └─────────┬──────────┘   │
│         │                │                     │               │
│  ┌──────▼──────┐  ┌──────▼───────┐  ┌─────────▼──────────┐   │
│  │ LLM Gateway │  │  MCP Client  │  │  Grafana Client    │   │
│  │  multi-     │  │  SSE conn to │  │  httpx async       │   │
│  │  provider   │  │  mcp-server  │  │  API wrapper       │   │
│  └──────┬──────┘  └──────┬───────┘  └────────────────────┘   │
│         │                │                                     │
│  ┌──────▼────────────────▼───────────────────────────────┐    │
│  │         Skills Engine  ·  Investigation Runner         │    │
│  │         Query Validator  ·  Auth Middleware            │    │
│  └───────────────────────────────────────────────────────┘    │
└────────────────────────────┬──────────────────────────────────┘
                             │ SSE (Server-Sent Events)
                             │
┌────────────────────────────▼──────────────────────────────────┐
│           Grafana MCP Server  (port 8080)                      │
│           Go binary — official grafana/mcp-grafana             │
│                                                                │
│   Tools: search_dashboards · get_dashboard · list_datasources  │
│          get_alerts · query_metrics · list_panels              │
└────────────────────────────┬──────────────────────────────────┘
                             │ Grafana HTTP API
                             │
┌────────────────────────────▼──────────────────────────────────┐
│                   Grafana (port 3000)                          │
│    Dashboards · Alerting · Unified Alerting · Annotations      │
│    Datasources: Prometheus / Loki / Tempo / Pyroscope / Faro   │
└────────────────────────────┬──────────────────────────────────┘
                             │
          ┌──────────────────┴──────────────────┐
          │                                     │
┌─────────▼──────────┐               ┌──────────▼─────────┐
│  Prometheus         │               │  Loki               │
│  (port 9090)        │               │  (port 3100)        │
│  Metrics + PromQL   │               │  Logs + LogQL       │
└────────────────────┘               └────────────────────┘
```

### Request Flow — Chat Message

```
User types message in Chat UI
        │
        ▼
POST /api/v1/chat/stream  (SSE)
        │
        ▼
LLM Gateway picks provider (OpenAI / Anthropic / Azure / Gemini / Ollama)
        │
        ▼
LLM generates tool calls → MCP Client calls Grafana MCP Server
        │
        ▼
MCP Server queries live Grafana data (dashboards, metrics, alerts, logs)
        │
        ▼
Results stream back to LLM → LLM generates answer
        │
        ▼
SSE tokens stream to React UI in real-time
```

---

## Full Stack

### Frontend — React + TypeScript

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | 18.3 |
| Language | TypeScript | 5.5 |
| Build tool | Vite | 5.3 |
| Styling | Tailwind CSS | 3.4 |
| Animations | Framer Motion | 11.0 |
| Icons | Lucide React | 0.400 |
| Routing | React Router DOM | 6.24 |
| Server state | TanStack Query | 5.51 |
| Client state | Zustand | 4.5 |
| Charts | Recharts | 2.12 |
| Markdown | react-markdown + rehype-highlight | 9.0 |
| HTTP client | Axios | — |

**UI Pages:**

| Page | Route | Description |
|------|-------|-------------|
| Chat | `/chat` | AI assistant chat with SSE streaming |
| Investigate | `/investigate` | Guided observability investigation |
| Dashboards | `/dashboards` | Browse & search Grafana dashboards |
| Query Builder | `/query` | Build and run Prometheus/Loki queries |
| Skills | `/skills` | Pre-built investigation playbooks |
| Settings | `/settings` | LLM provider + API key configuration |

**Design system:**
- Dark theme by default — `#050A14` base, `#0D1321` surface, `#111827` elevated
- Blue accent system — `#3B82F6` primary, `#06B6D4` cyan
- Glassmorphism header — `rgba(5,10,20,0.85)` + `backdrop-filter: blur(20px)`
- Animated canvas particle background (80 particles, edge-wrapping RAF loop)
- Framer Motion spring animations on sidebar collapse, nav hover, card mounts

---

### Backend — Python FastAPI

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | FastAPI | 0.115+ |
| Runtime | Python | 3.11+ |
| ASGI server | Uvicorn | 0.30+ |
| Data validation | Pydantic v2 | 2.8+ |
| Settings | pydantic-settings | 2.3+ |
| HTTP client | httpx | 0.27+ |
| Logging | structlog | 24.0+ |
| SSE streaming | sse-starlette | 2.1+ |
| Auth | python-jose | 3.3 |
| Rate limiting | slowapi | 0.1.9 |
| Metrics | prometheus-fastapi-instrumentator | 7.0+ |
| LLM — OpenAI | openai | 1.35+ |
| LLM — Anthropic | anthropic | 0.29+ |
| LLM — Google | google-generativeai | 0.7+ |
| MCP protocol | mcp | 1.0.0 |
| AWS secrets | boto3 | 1.34 |
| Azure secrets | azure-keyvault-secrets | 4.8 |
| GCP secrets | google-cloud-secret-manager | 2.20 |
| Retry logic | tenacity | 8.3 |

**API Routes:**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/healthz` | Liveness probe |
| `GET` | `/readyz` | Readiness probe |
| `GET` | `/metrics` | Prometheus metrics |
| `POST` | `/api/v1/chat/stream` | SSE chat stream with tool calling |
| `GET` | `/api/v1/mcp/tools` | List available MCP tools |
| `POST` | `/api/v1/mcp/tools/refresh` | Refresh tool list from MCP server |
| `GET` | `/api/v1/grafana/dashboards` | Search dashboards |
| `GET` | `/api/v1/grafana/dashboards/{uid}` | Get single dashboard |
| `GET` | `/api/v1/grafana/datasources` | List datasources |
| `GET` | `/api/v1/grafana/alerts` | Get firing alerts |
| `GET` | `/api/v1/skills` | List skill templates |
| `POST` | `/api/v1/investigations` | Start a new investigation |
| `GET` | `/api/v1/investigations/{id}` | Get investigation result |
| `POST` | `/api/v1/queries/validate` | Validate PromQL/LogQL |
| `GET` | `/api/v1/auth/me` | Current user info |
| `GET` | `/docs` | Swagger UI (dev only) |

---

### MCP Server — Go

The official [grafana/mcp-grafana](https://github.com/grafana/mcp-grafana) binary, running as a Docker container. Exposes Grafana capabilities as MCP tools over SSE transport.

**Available MCP Tools:**

| Tool | Description |
|------|-------------|
| `search_dashboards` | Search dashboards by query, tag, or folder |
| `get_dashboard` | Fetch full dashboard JSON by UID |
| `list_datasources` | List all configured Grafana datasources |
| `get_alerts` | Get active alert rules and their states |
| `list_panels` | List panels in a specific dashboard |
| `query_metrics` | Execute PromQL against a Prometheus datasource |
| `get_annotations` | Fetch deployment / change annotations |

---

### Observability Stack (Local)

| Service | Port | Purpose |
|---------|------|---------|
| Grafana | 3000 | Dashboards, alerting, datasource management |
| Prometheus | 9090 | Metrics storage + PromQL engine |
| Loki | 3100 | Log aggregation + LogQL engine |
| Promtail | — | Log shipper (Docker → Loki) |

---

## Software Requirements

### Required

| Tool | Minimum Version | Install |
|------|----------------|---------|
| Docker | 24.0+ | [docs.docker.com](https://docs.docker.com/engine/install/) |
| Docker Compose | v2.20+ | Included with Docker Desktop |
| `make` | any | `brew install make` (macOS) |
| Git | 2.x | `brew install git` |

### For local Kubernetes (optional)

| Tool | Install |
|------|---------|
| `kind` | `brew install kind` |
| `kubectl` | `brew install kubectl` |
| `helm` | `brew install helm` |

### For cloud deployment (optional)

| Tool | Install |
|------|---------|
| AWS CLI | `brew install awscli` |
| Azure CLI | `brew install azure-cli` |
| `gcloud` | [cloud.google.com/sdk](https://cloud.google.com/sdk/docs/install) |
| Terraform | 1.8+ via `brew install terraform` |

### LLM API Keys (at least one required)

| Provider | Env Var | Get key at |
|----------|---------|-----------|
| OpenAI | `OPENAI_API_KEY` | platform.openai.com |
| Anthropic | `ANTHROPIC_API_KEY` | console.anthropic.com |
| Azure OpenAI | `AZURE_OPENAI_API_KEY` + endpoint + deployment | Azure Portal |
| Google Gemini | `GOOGLE_API_KEY` | aistudio.google.com |
| Ollama (local) | `OLLAMA_BASE_URL` | No key needed — free |

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-org/grafana-mcp-platform
cd grafana-mcp-platform
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and set at minimum:

```bash
# Required — at least one LLM key
OPENAI_API_KEY=sk-...

# Required — your Grafana instance
GRAFANA_URL=http://localhost:3000       # or your Grafana URL
GRAFANA_API_KEY=glsa_...               # Grafana service account token

# Required — local dev auth
API_KEY_SECRET=change-me-local-dev-only
VITE_API_KEY=change-me-local-dev-only  # must match API_KEY_SECRET
```

To create a Grafana service account token:
```
Grafana → Administration → Service Accounts → Add service account token
Grant "Viewer" role minimum (or "Admin" for full access)
```

### 3. Start the full stack

```bash
make local-up
```

This builds and starts:
- `mcp-frontend` — React UI at **http://localhost:3001**
- `mcp-backend` — FastAPI at **http://localhost:8000**
- `mcp-server` — Grafana MCP Server at **http://localhost:8080**
- `grafana` — Grafana at **http://localhost:3000**
- `prometheus` — Prometheus at **http://localhost:9090**
- `loki` — Loki at **http://localhost:3100**
- `promtail` — Log shipper (no port)

### 4. Open the UI

```bash
make open-ui
# or manually: open http://localhost:3001
```

---

## Running Services

After `make local-up`, all services are accessible:

| Service | URL | Default Credentials |
|---------|-----|-------------------|
| **NovaSRE Chat UI** | http://localhost:3001 | API key from `.env` |
| **FastAPI Swagger** | http://localhost:8000/docs | — |
| **Grafana** | http://localhost:3000 | `admin` / `admin` |
| **Prometheus** | http://localhost:9090 | — |
| **Loki** | http://localhost:3100 | — |
| **MCP Server SSE** | http://localhost:8080/sse | — |

---

## LLM Provider Configuration

Switch providers in real-time via the model dropdown in the top bar — no restart required.

| Provider | Required `.env` Variables |
|----------|--------------------------|
| **OpenAI** (default) | `OPENAI_API_KEY` |
| **Anthropic (Claude)** | `ANTHROPIC_API_KEY` |
| **Azure OpenAI** | `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT` |
| **Google Gemini** | `GOOGLE_API_KEY` |
| **Ollama (local)** | `OLLAMA_BASE_URL=http://localhost:11434` — run `make local-up-ollama` |
| **OpenAI-compatible** | `OPENAI_COMPATIBLE_BASE_URL`, `OPENAI_COMPATIBLE_API_KEY` |

---

## Make Targets

```bash
make local-up           # Start full local Docker Compose stack
make local-up-ollama    # Start stack + Ollama local LLM
make local-down         # Stop and remove all containers + volumes
make local-logs         # Tail backend + mcp-server logs
make local-logs-all     # Tail all service logs
make local-restart      # Restart backend after code changes

make build-all          # Build all 3 Docker images
make push-all           # Push images to registry

make test               # Run all tests (backend + frontend + helm)
make test-backend       # Run Python pytest
make test-frontend      # Run Vite/vitest
make test-helm          # Helm lint all values files

make lint               # Ruff + mypy + eslint + helm lint + trivy
make format             # Auto-format Python + TypeScript

make local-k8s-up       # Deploy to local kind cluster
make deploy-dev         # Helm deploy to DEV (AKS)
make deploy-perf        # Helm deploy to PERF (GKE)
make deploy-prod        # Helm deploy to PROD (EKS) — requires CONFIRM=yes
make bootstrap          # Bootstrap new cluster (cert-manager, ESO, ArgoCD, Kyverno)
make rotate-secrets     # Rotate secrets in cloud key vault

make open-ui            # Open Chat UI in browser
make open-grafana       # Open Grafana in browser
make open-api-docs      # Open FastAPI Swagger docs
```

---

## Project Structure

```
grafana-mcp-platform/
│
├── frontend/                          # React + TypeScript UI
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/                  # ChatInput, MessageThread, SuggestedPrompts
│   │   │   ├── Layout/                # AppShell, LeftSidebar, TopNav, RightPanel
│   │   │   └── ui/                    # AIAvatar, Badge, Button, Modal, Toast, ...
│   │   ├── pages/                     # ChatPage, DashboardsPage, InvestigatePage, ...
│   │   ├── store/                     # Zustand stores (chat, llm, ui, auth)
│   │   ├── hooks/                     # useChat, useStreaming, useSkills, ...
│   │   ├── services/                  # Axios API client
│   │   ├── types/                     # TypeScript type definitions
│   │   └── design-system/             # theme.css, animations.css, components.css
│   ├── tailwind.config.ts             # Design tokens + custom utilities
│   ├── postcss.config.js              # Tailwind PostCSS integration
│   ├── vite.config.ts                 # Vite build config
│   ├── nginx.conf                     # Production nginx (SPA routing + /api proxy)
│   └── Dockerfile                     # Multi-stage: node build → nginx serve
│
├── backend/                           # Python FastAPI LLM gateway + MCP proxy
│   ├── app/
│   │   ├── routers/                   # chat, mcp, grafana, skills, investigations, ...
│   │   ├── services/                  # llm_gateway, mcp_client, grafana_client, ...
│   │   ├── models/                    # Pydantic request/response schemas
│   │   ├── middleware/                # Auth middleware (API key + JWT)
│   │   ├── config.py                  # Pydantic Settings v2
│   │   └── main.py                    # FastAPI app + middleware + routers
│   ├── requirements.txt               # Production dependencies
│   ├── requirements-dev.txt           # Dev + test dependencies
│   └── Dockerfile                     # Multi-stage Python image
│
├── mcp-server/                        # Grafana MCP Server (Go binary wrapper)
│   ├── Dockerfile                     # Builds grafana/mcp-grafana binary
│   └── config/
│       └── mcp-config.yaml            # MCP server configuration
│
├── skills/                            # Pre-built investigation playbooks
│   └── templates/
│       ├── alert-triage.md            # Alert investigation workflow
│       ├── health-check.md            # Service health check
│       ├── latency-trace.md           # Latency + trace investigation
│       ├── log-analysis.md            # Log pattern analysis
│       ├── slo-burn-rate.md           # SLO burn rate calculation
│       ├── kubernetes-crashloop.md    # K8s CrashLoopBackOff analysis
│       ├── db-slow-query.md           # Database slow query investigation
│       ├── capacity-planning.md       # Capacity forecast
│       ├── service-dependency.md      # Dependency map analysis
│       └── k6-load-test.md            # Load test result analysis
│
├── docker/
│   └── docker-compose.yaml            # Full local development stack
│
├── helm/                              # Kubernetes Helm chart
│   └── grafana-mcp-platform/
│       ├── Chart.yaml
│       ├── values.yaml                # Default values
│       ├── values-dev.yaml            # DEV overrides
│       ├── values-perf.yaml           # PERF overrides
│       └── values-prod.yaml           # PROD overrides
│
├── terraform/                         # IaC for AKS / GKE / EKS
├── argocd/                            # GitOps ApplicationSet
├── scripts/                           # bootstrap.sh, rotate-secrets.sh
├── docs/                              # Architecture diagrams, security model
├── .env.example                       # All environment variables documented
├── Makefile                           # All developer commands
└── README.md                          # This file
```

---

## Skills (Investigation Playbooks)

Skills are pre-built, templated investigation workflows that the AI follows step-by-step. Available out of the box:

| Skill | Trigger | What it does |
|-------|---------|-------------|
| **Alert Triage** | Firing alert | Correlates alert context, queries related metrics and logs, suggests remediation |
| **Service Health Check** | Any service name | Checks RED metrics (rate, errors, duration), SLO burn, resource usage |
| **Latency Trace** | High P99 latency | Finds slowest spans, identifies bottleneck service, checks for DB/external call latency |
| **Log Analysis** | Service + time range | Extracts and deduplicates error patterns, highlights anomalous log bursts |
| **SLO Burn Rate** | Service + SLO target | Calculates 1h/6h/24h burn rates, estimates time to SLO breach |
| **Kubernetes CrashLoop** | Pod name | Checks OOMKill, exit codes, recent events, resource limits vs actual usage |
| **DB Slow Query** | Database name | Identifies slow query patterns from logs and traces |
| **Capacity Planning** | Service + metric | Projects resource usage growth, estimates when limits will be hit |
| **Service Dependency** | Service name | Maps upstream/downstream dependencies, identifies cascading failure paths |
| **Load Test Analysis** | k6 result dashboard | Summarises pass/fail, P95/P99 latency, error rate, throughput |

---

## Kubernetes Deployment

### 1. Bootstrap the cluster

```bash
# Point kubectl at your target cluster
bash scripts/bootstrap.sh
# Installs: cert-manager, External Secrets Operator, ArgoCD, Kyverno
```

### 2. Store secrets in your cloud key vault

```bash
# AWS (EKS)
aws secretsmanager create-secret --name grafana-mcp/openai-api-key --secret-string "sk-..."
aws secretsmanager create-secret --name grafana-mcp/grafana-api-key --secret-string "glsa_..."
aws secretsmanager create-secret --name grafana-mcp/api-key-secret --secret-string "your-api-key"

# Azure (AKS)
az keyvault secret set --vault-name grafana-mcp-dev --name openai-api-key --value "sk-..."

# GCP (GKE)
gcloud secrets create openai-api-key --data-file=- <<< "sk-..."
```

### 3. Deploy

```bash
make deploy-dev                # DEV cluster (AKS)
make deploy-perf               # PERF cluster (GKE)
CONFIRM=yes make deploy-prod   # PROD cluster (EKS) — requires explicit confirmation
```

### Environment Matrix

| Environment | Cloud | K8s Namespace | Auto-deploy |
|-------------|-------|---------------|-------------|
| DEV | AKS | `dev` | On push to `main` |
| PERF | GKE | `stage` | On push to `release/*` |
| PROD | EKS | `prod` | Manual approval only |

---

## Security

- **Secrets management** — External Secrets Operator syncs from AWS Secrets Manager / Azure Key Vault / GCP Secret Manager. Secrets never stored in git or container images.
- **Authentication** — API key auth for local dev. JWT / OIDC for production (configurable via `AUTH_JWKS_URI` + `AUTH_ISSUER`).
- **Image signing** — All Docker images signed with cosign (keyless, via GitHub OIDC) in CI.
- **Policy enforcement** — Kyverno policies enforce: non-root containers, no `latest` tags, resource limits required, no hostPath mounts.
- **Network policies** — Default-deny with explicit allow-only rules between services.
- **Container hardening** — Distroless/slim base images, read-only root filesystem, no extra Linux capabilities.
- **Rate limiting** — slowapi rate limiter on all API endpoints.
- **CORS** — Explicit allowlist via `ALLOWED_ORIGINS` env var.
- **CSP headers** — nginx serves strict Content-Security-Policy on the frontend.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| **Blank white/dark page** | Check that `postcss.config.js` exists in `frontend/`. Without it, Tailwind classes are not generated. Rebuild with `make local-up`. |
| **MCP server not available** | `docker compose -f docker/docker-compose.yaml logs mcp-server`. Ensure `GRAFANA_API_KEY` is set in `.env`. |
| **401 Unauthorized from API** | `VITE_API_KEY` in `.env` must match `API_KEY_SECRET`. Both must be set identically. |
| **LLM returns "Invalid API key"** | Check the provider's API key env var in `.env`. For Azure, also check `AZURE_OPENAI_ENDPOINT` and `AZURE_OPENAI_DEPLOYMENT`. |
| **Frontend shows "Loading tools…" forever** | Backend or MCP server hasn't started. Run `make local-logs` to inspect. |
| **Grafana dashboards not showing** | `GRAFANA_API_KEY` must be a valid service account token with at least Viewer role. |
| **CSS classes not applying** | Ensure `postcss.config.js` exists. Run `make build-frontend` to rebuild the image. |
| **Docker build fails** | Try `docker compose -f docker/docker-compose.yaml build --no-cache frontend`. |
| **Helm lint fails in CI** | Run `make test-helm` locally. Check `values-*.yaml` for missing required fields. |
| **ArgoCD not syncing** | Run `argocd app sync mcp-dev`. Check for Kyverno policy violations in pod Events. |

---

## Development Workflow

### Backend hot reload (no rebuild needed)

```bash
# The backend mounts ./backend/app as a volume with --reload
make local-up
# Edit any file in backend/app/ → uvicorn auto-reloads
```

### Frontend development (Vite dev server)

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev       # starts on http://localhost:5173 with HMR
```

### Full rebuild after config changes

```bash
make local-down
make local-up      # --build flag re-builds images
```

### Running tests

```bash
make test-backend   # pytest
make test-frontend  # vitest
make test-helm      # helm lint
make test           # all three
```

---

## References

- [grafana/mcp-grafana](https://github.com/grafana/mcp-grafana) — Official Grafana MCP server (Go)
- [Model Context Protocol spec](https://spec.modelcontextprotocol.io/) — MCP protocol specification
- [Grafana HTTP API](https://grafana.com/docs/grafana/latest/developers/http_api/) — Grafana REST API reference
- [Grafana LLM + MCP docs](https://grafana.com/docs/grafana-cloud/machine-learning/assistant/configure/mcp-servers/) — Official Grafana AI/MCP docs
- [aws-samples/sample-grafana-remote-mcp](https://github.com/aws-samples/sample-grafana-remote-mcp) — OAuth2.1 remote MCP pattern
- [FastAPI docs](https://fastapi.tiangolo.com/) — Python async web framework
- [LangChain MCP adapters](https://github.com/langchain-ai/langchain-mcp-adapters) — MCP tool integration for LangChain

---

## Author

**Gopal Rao Padidala**
Email: [gopalpadidala@gmail.com](mailto:gopalpadidala@gmail.com)
GitHub: [github.com/gpadidala](https://github.com/gpadidala)

Built with passion for making Observability intelligent.
If you find this useful, star the repo ⭐ and reach out!
