---
title: Service Dependency Impact Analysis
description: Map upstream/downstream impact from Tempo service graph, alert correlation, and RED metrics
category: investigation
datasources: [tempo, prometheus, grafana]
tags: [dependencies, service-map, impact, cascading, blast-radius]
---

# Service Dependency Impact Analysis

Determines the blast radius of an issue in `{{service_name}}` — which upstream callers and downstream dependencies are affected.

**Variables:**
- `{{service_name}}` — The service experiencing issues
- `{{namespace}}` — Kubernetes namespace
- `{{time_range}}` — Time window to analyze (e.g. 1h)

---

## Step 1: Get Service Dependencies from Tempo

Find all services that call `{{service_name}}` (upstream callers) and all services it calls (downstream dependencies):

```traceql
# Traces involving {{service_name}} as a span
{ .service.name = "{{service_name}}" }
| select(rootServiceName, rootSpanName, duration, traceDuration)
```

Find all parent spans (upstream callers):
```traceql
# Services that called {{service_name}} in the last {{time_range}}
{ span.service.name = "{{service_name}}" }
| select(rootServiceName, span.peer.service)
```

Find downstream services called by {{service_name}}:
```traceql
# Find DB, cache, external calls from {{service_name}}
{ rootServiceName = "{{service_name}}" && span.db.system != "" }
| select(span.db.system, span.db.name, span.peer.service, duration)
```

---

## Step 2: Check Upstream Services Error Rates

For each upstream caller of `{{service_name}}`, check if they are now experiencing elevated errors:

```promql
# Error rate for services that call {{service_name}}
# (Replace caller_service with each identified upstream)
sum by (app) (
  rate(http_requests_total{
    namespace="{{namespace}}",
    status=~"5.."
  }[5m])
)
/
sum by (app) (
  rate(http_requests_total{namespace="{{namespace}}"}[5m])
)
```

**Cross-correlation with {{service_name}} error start time:**
```promql
# Detect which services started erroring at the same time as {{service_name}}
sum by (app) (
  rate(http_requests_total{
    namespace="{{namespace}}",
    status=~"5.."
  }[1m]
  @ {{incident_start_timestamp}})
)
```

---

## Step 3: Check Downstream Consumer Error Rates

Services downstream of `{{service_name}}` may be timing out or failing due to this issue:

```promql
# Latency increase for services depending on {{service_name}}
# Look for timeout-related HTTP 503/504 errors
sum by (app) (
  rate(http_requests_total{
    namespace="{{namespace}}",
    status=~"50[34]"
  }[5m])
)
```

```promql
# Request queue depth / pending connections to {{service_name}}
sum(
  http_client_active_requests{
    target_service="{{service_name}}"
  }
)
```

Trace the impact chain via slow traces:
```traceql
# Traces > 5s that pass through {{service_name}}
{ .service.name != "{{service_name}}" && duration > 5s }
| select(rootServiceName, rootSpanName, traceDuration)
```

---

## Step 4: Correlate Alert Timing Across Services

Fetch active/recent alerts from Grafana Alertmanager to find which services are co-alerting:

Alert correlation query (using MCP `grafana_get_alerts` tool):
```
state: firing
time: last {{time_range}}
```

For each firing alert, check temporal alignment:
- Alerts that fired within ±5 minutes of `{{service_name}}` alerts = likely causal
- Alerts on upstream services = `{{service_name}}` is a victim (not root cause)
- Alerts on downstream services = `{{service_name}}` is the cause

**Symptom vs Root Cause Determination:**
```
If {{service_name}} is upstream → downstream is the root cause
If {{service_name}} is downstream → upstream is the root cause
If {{service_name}} is isolated → it is likely the root cause
```

---

## Step 5: Identify Blast Radius and Affected Users

Estimate user impact using Faro RUM data (if available):

```logql
# Count unique sessions hitting errors routed through {{service_name}}
count_over_time(
  {kind="exception", service="{{service_name}}"}
  | json
  | session_id != "" [{{time_range}}]
)
```

```logql
# Count distinct affected users
count(distinct_over_time(
  {app="{{service_name}}"} | json | user_id != "" [{{time_range}}]
))
```

From Prometheus (indirect user impact):
```promql
# Total failed requests impacting end users
sum(
  increase(http_requests_total{
    namespace="{{namespace}}",
    status=~"5.."
  }[{{time_range}}])
)
```

**Blast radius summary:**
```
Direct impact:
  - Services failed: {{service_name}}
  - Upstream callers affected: [list from Step 2]
  - Downstream dependencies degraded: [list from Step 3]

User impact:
  - Estimated affected sessions: [from Faro]
  - Failed requests: [from Prometheus]
  - Revenue risk: [failed requests × avg order value if applicable]

Recommended actions:
  1. Isolate {{service_name}} if it's the root cause (circuit breaker, feature flag)
  2. Increase timeouts in callers to reduce cascading failures
  3. Implement retry with exponential backoff in downstream consumers
  4. Add dependency health checks to readiness probe
```
