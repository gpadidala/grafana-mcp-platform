# Architecture — Grafana MCP Platform

## System Overview

The Grafana MCP Platform is a 4-tier AI-powered observability assistant that connects users to their Grafana stack via the Model Context Protocol.

```mermaid
graph TB
    User["👤 User Browser"] --> Frontend

    subgraph "Tier 1: React UI (port 3001)"
        Frontend["React + TypeScript<br/>ChatPanel · LLMSelector<br/>MCPToolsPanel · DashboardExplorer"]
    end

    Frontend -->|"REST + SSE streaming<br/>/api/v1/chat"| Backend

    subgraph "Tier 2: FastAPI Backend (port 8000)"
        Backend["LLM Gateway<br/>Multi-provider: OpenAI · Anthropic<br/>Azure · Gemini · Ollama"]
        Auth["JWT / OAuth2.1<br/>Rate Limiting (slowapi)"]
    end

    Backend -->|"MCP SSE transport<br/>list_tools · call_tool"| MCPServer

    subgraph "Tier 3: MCP Server (port 8080)"
        MCPServer["grafana/mcp-grafana<br/>Go binary · distroless<br/>search_dashboards · query_datasource<br/>get_alerts · execute_query"]
    end

    MCPServer -->|"Grafana HTTP API<br/>port 3000"| Grafana

    subgraph "Tier 4: Grafana Stack"
        Grafana["Grafana Enterprise"]
        Prometheus["Mimir / Prometheus"]
        Loki["Loki"]
        Tempo["Tempo"]
    end

    Backend --> LLMProviders

    subgraph "LLM Providers (HTTPS 443)"
        LLMProviders["OpenAI API · Anthropic API<br/>Azure OpenAI · Gemini API<br/>Ollama (local)"]
    end
```

## Chat Request Flow (Agentic Loop)

```mermaid
sequenceDiagram
    participant U as User
    participant FE as React UI
    participant BE as FastAPI Backend
    participant LLM as LLM Provider
    participant MCP as MCP Server
    participant G as Grafana

    U->>FE: Type message "Show active alerts"
    FE->>BE: POST /api/v1/chat (SSE stream)
    BE->>BE: Authenticate JWT / API key
    BE->>MCP: list_tools()
    MCP-->>BE: [get_alerts, search_dashboards, ...]
    BE->>LLM: chat(messages, tools=[...])
    LLM-->>BE: tool_call: get_alerts(state="firing")
    BE->>FE: SSE: {"type":"tool_call_start","tool":"get_alerts"}
    BE->>MCP: call_tool("get_alerts", {state:"firing"})
    MCP->>G: GET /api/alerting/alerts?state=firing
    G-->>MCP: [{name, labels, state}...]
    MCP-->>BE: tool result
    BE->>FE: SSE: {"type":"tool_call_result","result":{...}}
    BE->>LLM: chat(messages + tool_result)
    LLM-->>BE: "You have 3 firing alerts: ..."
    BE->>FE: SSE: {"type":"text_delta","content":"You have..."}
    BE->>FE: SSE: {"type":"done","usage":{...}}
    FE->>U: Rendered markdown response
```

## CI/CD Pipeline Flow

```mermaid
flowchart LR
    PR["Pull Request"] --> CI

    subgraph CI["CI (ci.yaml)"]
        lint-fe["lint-frontend<br/>ESLint · TypeScript · vitest"]
        lint-be["lint-backend<br/>ruff · mypy · pytest"]
        lint-helm["helm lint<br/>kubesec scan"]
        lint-tf["tf validate<br/>checkov"]
        security["gitleaks<br/>trivy scan<br/>SBOM generation<br/>cosign sign"]
    end

    CI --> Push["Push to main"]
    Push --> CDDev

    subgraph CDDev["CD Dev (cd-dev.yaml)"]
        build["docker buildx<br/>linux/amd64 + arm64"]
        scan["trivy CRITICAL check"]
        sign["cosign keyless sign<br/>(GitHub OIDC)"]
        update["Update values-dev.yaml<br/>image.tag = dev-SHA"]
    end

    update --> ArgoCD["ArgoCD auto-sync<br/>(namespace: dev)"]

    PushRelease["Push to release/*"] --> CDPerf["CD Perf<br/>→ values-perf.yaml<br/>→ ArgoCD (stage ns)"]

    ManualTrigger["workflow_dispatch<br/>version=X.Y.Z<br/>2-reviewer approval"] --> CDProd
    subgraph CDProd["CD Prod (cd-prod.yaml)"]
        buildProd["Build + push semver tag"]
        scanProd["Trivy CRITICAL fail"]
        signProd["cosign sign"]
        updateProd["Update values-prod.yaml"]
        release["GitHub Release<br/>+ Slack notify"]
    end

    CDProd --> ArgoCDProd["ArgoCD manual sync<br/>(namespace: prod)"]
```

## Secret Management Flow

```mermaid
flowchart LR
    subgraph "Cloud Key Vault"
        AWSSM["AWS Secrets Manager<br/>grafana-mcp-prod/openai-api-key"]
        AzureKV["Azure Key Vault<br/>grafana-mcp-dev"]
        GCPSM["GCP Secret Manager<br/>grafana-mcp-perf"]
    end

    AWSSM & AzureKV & GCPSM --> ESO

    subgraph "Kubernetes (each namespace)"
        ESO["External Secrets Operator<br/>ExternalSecret CRD"]
        ESO --> K8sSecret["K8s Secret<br/>(created + rotated by ESO)"]
        K8sSecret --> Pod["Pod env vars<br/>via secretKeyRef"]
    end

    Pod --> Backend["FastAPI Backend"]
```

## Network Policy Diagram

```
Internet
    │
    ▼
[Ingress Controller (ingress-nginx)]
    │
    ▼ (allowed)
[frontend pod :3001]
    │
    ▼ (allowed: port 8000)
[backend pod :8000] ──→ LLM APIs (HTTPS 443, external only)
    │
    ▼ (allowed: port 8080)
[mcp-server pod :8080]
    │
    ▼ (allowed: port 3000)
[grafana pod :3000]

Default policy: DENY ALL (ingress + egress)
DNS (UDP 53) always allowed for pod DNS resolution
```

## Component Table

| Component | Technology | Purpose |
|-----------|-----------|---------|
| React Frontend | React 18, TypeScript, Vite, Zustand, TailwindCSS | Chat UI, LLM selector, MCP tools panel |
| FastAPI Backend | Python 3.12, FastAPI, SSE-Starlette, slowapi | LLM gateway, MCP proxy, auth, metrics |
| Grafana MCP Server | Go 1.22, distroless runtime | Exposes Grafana APIs as MCP tools |
| Grafana | Grafana 11 | Dashboards, alerts, datasource proxy |
| LLM Providers | OpenAI, Anthropic, Azure, Gemini, Ollama | Language model inference |
| External Secrets Operator | ESO 0.10 | Sync secrets from cloud KVs |
| cert-manager | cert-manager 1.15 | Automatic TLS certificate management |
| Kyverno | Kyverno 3.2 | Kubernetes policy enforcement |
| ArgoCD | ArgoCD 2.11 | GitOps continuous deployment |
| Terraform | 1.8 | Cloud infrastructure provisioning |

## Security Threat Model

### Secret Exfiltration
- **Threat**: API keys extracted from pods or git history
- **Mitigations**: ESO + cloud KVs (never in K8s secrets yaml), gitleaks pre-commit hook, `.env` in `.gitignore`, RBAC `secretKeyRef` scoped per secret

### Container Escape
- **Threat**: Exploited container breaks out to host
- **Mitigations**: Distroless base images (no shell), `readOnlyRootFilesystem`, all capabilities dropped, `runAsUser: 65534`, `seccompProfile: RuntimeDefault`, Kyverno policies enforcing all of the above

### Supply Chain Attack
- **Threat**: Malicious dependency or image substitution
- **Mitigations**: `cosign` keyless signing on every push, `syft` SBOM for every image, `trivy` scanning (fail on CRITICAL), Kyverno `verify-image-signature` policy in prod, pinned base image digests

### Lateral Movement
- **Threat**: Compromised pod accesses other services
- **Mitigations**: Default-deny NetworkPolicy, explicit allow-only rules per component, ServiceAccount `automountServiceAccountToken: false`, IRSA/Workload Identity for cloud resource access only
