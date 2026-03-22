---
title: Latency & Trace Analysis
description: Trace P99 latency spike to the bottleneck span and map service dependencies
category: traces
datasources: [tempo, prometheus]
tags: [latency, traces, traceql, performance]
---

# Latency & Trace Analysis

Identifies which span in the distributed trace is responsible for a latency spike, maps
service call graphs, and compares current behaviour against a pre-incident baseline.

**Variables:**
- `{{service_name}}` — Root service experiencing high latency (e.g. checkout, api-gateway)
- `{{threshold_ms}}` — Latency threshold in milliseconds to flag slow traces (default: 2000)
- `{{time_range}}` — Investigation window (e.g. 30m, 1h)
- `{{namespace}}` — Kubernetes namespace (e.g. production)

## Step 1: Find Slow Traces with TraceQL

Surface all traces where total duration exceeds the threshold, scoped to the service under investigation.

```traceql
{ .service.name = "{{service_name}}" && duration > {{threshold_ms}}ms }
  | select(duration, rootName, rootServiceName, .http.method, .http.url, .http.status_code)
```

Find traces that also contain errors (slow AND failing):
```traceql
{ .service.name = "{{service_name}}" && duration > {{threshold_ms}}ms && status = error }
  | select(duration, rootName, .http.status_code, .error.message)
```

Count how many requests are exceeding the threshold (gives scope of impact):
```traceql
count() { .service.name = "{{service_name}}" && duration > {{threshold_ms}}ms }
```

Confirm with Prometheus P99 across the same window:
```promql
histogram_quantile(0.99,
  rate(http_request_duration_seconds_bucket{app="{{service_name}}",namespace="{{namespace}}"}[5m])
)
```

Also fetch P50 and P95 to understand distribution shape:
```promql
histogram_quantile(0.50, rate(http_request_duration_seconds_bucket{app="{{service_name}}"}[5m]))
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{app="{{service_name}}"}[5m]))
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{app="{{service_name}}"}[5m]))
```

## Step 2: Identify Bottleneck Span

From the slow traces found in Step 1, drill into individual traces to find which child span
consumes the majority of wall-clock time.

Fetch spans for the single slowest trace:
```
GET /api/traces/{trace_id}
```

Use TraceQL to find the specific span type adding the most latency:
```traceql
{ .service.name = "{{service_name}}" && duration > {{threshold_ms}}ms }
  | select(duration, name, .db.system, .db.statement, .peer.service, .http.url)
```

Isolate database spans only (reveals slow queries):
```traceql
{ .service.name = "{{service_name}}" && .db.system != nil && duration > 500ms }
  | select(duration, .db.system, .db.operation, .db.statement, .db.name)
```

Isolate HTTP client spans only (reveals slow upstream calls):
```traceql
{ .service.name = "{{service_name}}" && .http.client != nil && duration > 500ms }
  | select(duration, .http.method, .http.url, .http.status_code, .peer.service)
```

## Step 3: Compare to Baseline

Establish whether the latency pattern is new or a pre-existing condition.

Baseline P99 from 24 hours ago (same traffic pattern):
```promql
histogram_quantile(0.99,
  rate(http_request_duration_seconds_bucket{app="{{service_name}}"}[5m] offset 24h)
)
```

Week-over-week baseline (accounts for weekly traffic seasonality):
```promql
histogram_quantile(0.99,
  rate(http_request_duration_seconds_bucket{app="{{service_name}}"}[5m] offset 1w)
)
```

Baseline slow trace count (how many crossed threshold at the same time yesterday):
```traceql
count() { .service.name = "{{service_name}}" && duration > {{threshold_ms}}ms }
```
Run this query against a time range 24 hours earlier and compare count.

Check for a deployment annotation near the latency spike start time:
```
GET /api/annotations?tags=deployment&tags={{service_name}}&from={{spike_start_unix_ms}}&to={{spike_start_unix_ms + 3600000}}
```

## Step 4: Map Service Dependencies

Understand which downstream services the slow spans call and whether the latency
originates locally or is inherited from a dependency.

```traceql
{ rootServiceName = "{{service_name}}" }
  | select(duration, .service.name, name, .peer.service, .peer.hostname)
```

Build service call graph — list all unique downstream services called:
```traceql
{ rootServiceName = "{{service_name}}" && duration > {{threshold_ms}}ms }
  | select(.service.name, .peer.service, duration)
```

Fetch the Tempo service graph metrics (pre-aggregated by Tempo):
```promql
# Service-to-service request rate
sum by (client, server) (
  rate(traces_service_graph_request_total{server="{{service_name}}"}[5m])
)

# Service-to-service P99 latency
histogram_quantile(0.99,
  sum by (client, server, le) (
    rate(traces_service_graph_request_duration_seconds_bucket{server="{{service_name}}"}[5m])
  )
)
```

Identify which edge in the service graph has the highest latency:
```promql
topk(5,
  histogram_quantile(0.99,
    sum by (client, server, le) (
      rate(traces_service_graph_request_duration_seconds_bucket[5m])
    )
  )
)
```

## Step 5: Check Correlated Metrics

Confirm whether the bottleneck span correlates with resource or database saturation metrics.

If bottleneck is a database span:
```promql
# DB query duration P99
histogram_quantile(0.99,
  rate(db_query_duration_seconds_bucket{app="{{service_name}}"}[5m])
)

# Connection pool saturation
db_pool_connections_active{app="{{service_name}}"}
  / db_pool_connections_max{app="{{service_name}}"}
```

If bottleneck is a downstream HTTP call:
```promql
# Target service error rate
rate(http_requests_total{app="{{downstream_service}}",status=~"5.."}[5m])
  / rate(http_requests_total{app="{{downstream_service}}"}[5m])

# Target service P99 latency
histogram_quantile(0.99,
  rate(http_request_duration_seconds_bucket{app="{{downstream_service}}"}[5m])
)
```

If bottleneck is CPU-bound processing in the service itself:
```promql
# CPU throttling rate
rate(container_cpu_cfs_throttled_seconds_total{pod=~"{{service_name}}-.*"}[5m])

# CPU usage vs request
rate(container_cpu_usage_seconds_total{pod=~"{{service_name}}-.*"}[5m])
  / on(pod) kube_pod_container_resource_requests{resource="cpu", pod=~"{{service_name}}-.*"}
```

**Summary — root cause classification:**
- Slow db span + high connection pool = database bottleneck → proceed to db-slow-query.md
- Slow http span + downstream errors = cascading failure → run health-check.md on dependency
- All spans slow + CPU throttling = compute saturation → scale up or optimize code
- Latency only on specific operation = code path regression → correlate with recent deployment
