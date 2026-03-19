# ─────────────────────────────────────────────────────────────────
# Grafana MCP Platform — Developer Makefile
# ─────────────────────────────────────────────────────────────────

REGISTRY       ?= ghcr.io/your-org       # TODO: set your registry
VERSION        ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
GIT_COMMIT     := $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")
BUILD_DATE     := $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")

HELM_RELEASE   := grafana-mcp
HELM_CHART     := helm/grafana-mcp-platform

.DEFAULT_GOAL  := help

.PHONY: help
help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"; printf "\033[36mUsage:\033[0m\n  make \033[36m<target>\033[0m\n\nTargets:\n"} \
	  /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

# ── Local Development ─────────────────────────────────────────────

.PHONY: local-up
local-up: ## Start full local stack (mcp-server + backend + frontend + grafana + prometheus + loki)
	docker compose -f docker/docker-compose.yaml up -d --build
	@echo "✅ Stack running:"
	@echo "   React UI:   http://localhost:3001"
	@echo "   API docs:   http://localhost:8000/docs"
	@echo "   Grafana:    http://localhost:3000  (admin/admin)"
	@echo "   Prometheus: http://localhost:9090"

.PHONY: local-up-ollama
local-up-ollama: ## Start stack with Ollama local LLM
	docker compose -f docker/docker-compose.yaml --profile ollama up -d --build
	@echo "✅ Ollama available at http://localhost:11434"

.PHONY: local-down
local-down: ## Stop and remove all containers + volumes
	docker compose -f docker/docker-compose.yaml --profile ollama down -v

.PHONY: local-logs
local-logs: ## Tail logs from backend + mcp-server
	docker compose -f docker/docker-compose.yaml logs -f backend mcp-server

.PHONY: local-logs-all
local-logs-all: ## Tail all service logs
	docker compose -f docker/docker-compose.yaml logs -f

.PHONY: local-restart
local-restart: ## Restart backend (after code changes)
	docker compose -f docker/docker-compose.yaml restart backend

.PHONY: local-k8s-up
local-k8s-up: ## Create local kind cluster + deploy helm chart to dev namespace
	@which kind > /dev/null || (echo "Install kind: https://kind.sigs.k8s.io/" && exit 1)
	kind create cluster --name grafana-mcp-local 2>/dev/null || true
	kubectl create namespace dev 2>/dev/null || true
	bash scripts/local-setup.sh
	helm upgrade --install $(HELM_RELEASE) $(HELM_CHART) \
	  -n dev \
	  -f $(HELM_CHART)/values.yaml \
	  -f $(HELM_CHART)/values-dev.yaml \
	  --set global.imageRegistry=$(REGISTRY)
	@echo "✅ Deployed to local kind cluster (namespace: dev)"

.PHONY: local-k8s-down
local-k8s-down: ## Delete the local kind cluster
	kind delete cluster --name grafana-mcp-local

# ── Build ─────────────────────────────────────────────────────────

.PHONY: build-backend
build-backend: ## Build backend Docker image
	docker build \
	  -t $(REGISTRY)/grafana-mcp/backend:$(VERSION) \
	  -t $(REGISTRY)/grafana-mcp/backend:local \
	  backend/

.PHONY: build-frontend
build-frontend: ## Build frontend Docker image
	docker build \
	  -t $(REGISTRY)/grafana-mcp/frontend:$(VERSION) \
	  -t $(REGISTRY)/grafana-mcp/frontend:local \
	  frontend/

.PHONY: build-mcp
build-mcp: ## Build MCP server Docker image
	docker build \
	  --build-arg VERSION=$(VERSION) \
	  --build-arg GIT_COMMIT=$(GIT_COMMIT) \
	  --build-arg BUILD_DATE=$(BUILD_DATE) \
	  -t $(REGISTRY)/grafana-mcp/server:$(VERSION) \
	  -t $(REGISTRY)/grafana-mcp/server:local \
	  mcp-server/

.PHONY: build-all
build-all: build-backend build-frontend build-mcp ## Build all Docker images

# ── Push ──────────────────────────────────────────────────────────

.PHONY: push-all
push-all: ## Push all images to registry
	docker push $(REGISTRY)/grafana-mcp/backend:$(VERSION)
	docker push $(REGISTRY)/grafana-mcp/frontend:$(VERSION)
	docker push $(REGISTRY)/grafana-mcp/server:$(VERSION)

# ── Test ──────────────────────────────────────────────────────────

.PHONY: test-backend
test-backend: ## Run backend pytest tests
	cd backend && pip install -r requirements-dev.txt -q && \
	  pytest tests/ -v --tb=short

.PHONY: test-frontend
test-frontend: ## Run frontend vitest tests
	cd frontend && npm ci --legacy-peer-deps -s && npm run test

.PHONY: test-helm
test-helm: ## Run helm lint on all values files
	helm lint $(HELM_CHART)/
	helm lint $(HELM_CHART)/ -f $(HELM_CHART)/values-dev.yaml
	helm lint $(HELM_CHART)/ -f $(HELM_CHART)/values-perf.yaml
	helm lint $(HELM_CHART)/ -f $(HELM_CHART)/values-prod.yaml

.PHONY: test
test: test-backend test-frontend test-helm ## Run all tests

# ── Lint ──────────────────────────────────────────────────────────

.PHONY: lint
lint: ## Run all linters
	cd backend && ruff check app/ tests/ && mypy app/ --ignore-missing-imports
	cd frontend && npm run lint
	helm lint $(HELM_CHART)/
	terraform fmt -check -recursive terraform/ 2>/dev/null || true
	@which trivy > /dev/null && trivy image --severity HIGH,CRITICAL $(REGISTRY)/grafana-mcp/backend:local 2>/dev/null || true

.PHONY: format
format: ## Auto-format code
	cd backend && ruff format app/ tests/ && isort app/ tests/ --quiet
	cd frontend && npm run format

# ── Deploy ────────────────────────────────────────────────────────

.PHONY: deploy-dev
deploy-dev: ## Deploy to DEV cluster (AKS)
	helm upgrade --install $(HELM_RELEASE) $(HELM_CHART) \
	  --namespace dev \
	  --create-namespace \
	  -f $(HELM_CHART)/values.yaml \
	  -f $(HELM_CHART)/values-dev.yaml \
	  --set global.imageRegistry=$(REGISTRY) \
	  --atomic \
	  --timeout 5m

.PHONY: deploy-perf
deploy-perf: ## Deploy to PERF cluster (GKE)
	helm upgrade --install $(HELM_RELEASE) $(HELM_CHART) \
	  --namespace stage \
	  --create-namespace \
	  -f $(HELM_CHART)/values.yaml \
	  -f $(HELM_CHART)/values-perf.yaml \
	  --set global.imageRegistry=$(REGISTRY) \
	  --atomic \
	  --timeout 10m

.PHONY: deploy-prod
deploy-prod: ## Deploy to PROD cluster (EKS) — requires CONFIRM=yes
	@[ "$(CONFIRM)" = "yes" ] || (echo "❌ Set CONFIRM=yes to deploy to prod" && exit 1)
	helm upgrade --install $(HELM_RELEASE) $(HELM_CHART) \
	  --namespace prod \
	  --create-namespace \
	  -f $(HELM_CHART)/values.yaml \
	  -f $(HELM_CHART)/values-prod.yaml \
	  --set global.imageRegistry=$(REGISTRY) \
	  --atomic \
	  --timeout 15m

# ── Migrations / Bootstrap ────────────────────────────────────────

.PHONY: bootstrap
bootstrap: ## Bootstrap a new cluster (cert-manager, ESO, ArgoCD, Kyverno)
	bash scripts/bootstrap.sh

.PHONY: migrate
migrate: ## Run database migrations (if applicable)
	@echo "No DB migrations in current stack (stateless backend)"

# ── Secrets ───────────────────────────────────────────────────────

.PHONY: rotate-secrets
rotate-secrets: ## Rotate Grafana API key and LLM keys
	bash scripts/rotate-secrets.sh

# ── Monitoring ────────────────────────────────────────────────────

.PHONY: open-grafana
open-grafana: ## Open Grafana in browser
	open http://localhost:3000

.PHONY: open-ui
open-ui: ## Open the MCP Chat UI in browser
	open http://localhost:3001

.PHONY: open-api-docs
open-api-docs: ## Open FastAPI Swagger docs in browser
	open http://localhost:8000/docs
