---
title: Service Health Check
description: RED method (Rate, Error rate, Duration) + 4 Golden Signals for any named service
category: investigation
datasources: [prometheus, loki, tempo]
tags: [health, red, sre, golden-signals]
---

# Service Health Check

Checks the 4 Golden Signals for {{service_name}} in the {{namespace}} namespace.

**Variables:**
- `{{service_name}}` — Name of the service (e.g. checkout, auth, payment)
- `{{namespace}}` — Kubernetes namespace (e.g. production, default)
- `{{time_range}}` — Time window to check (default: 30m)

## Step 1: Error Rate

Query error rate from Prometheus/Mimir.

```promql
rate(http_requests_total{app="{{service_name}}",namespace="{{namespace}}",status=~"5.."}[5m])
  /
rate(http_requests_total{app="{{service_name}}",namespace="{{namespace}}"}[5m])
```

**Threshold:** Alert if error rate > 1%. Investigate if > 0.1% sustained.

## Step 2: Request Rate (Traffic)

```promql
sum(rate(http_requests_total{app="{{service_name}}",namespace="{{namespace}}"}[5m])) by (status_code)
```

Compare to baseline (same time previous day):
```promql
sum(rate(http_requests_total{app="{{service_name}}"}[5m] offset 24h))
```

## Step 3: P99 Latency (Duration)

```promql
histogram_quantile(0.99,
  rate(http_request_duration_seconds_bucket{app="{{service_name}}"}[{{time_range}}])
)
```

**Threshold:** > 1s = Warning. > 3s = Critical.

## Step 4: Log Error Digest

```logql
{app="{{service_name}}", namespace="{{namespace}}"}
  |~ "ERROR|FATAL|panic|Exception"
  | json
  | line_format "{{.level}} {{.msg}}"
```

Count top error patterns:
```logql
sum by (msg) (
  count_over_time({app="{{service_name}}"} |~ "ERROR" | json [{{time_range}}])
)
```

## Step 5: Saturation (CPU + Memory)

```promql
# CPU utilization
100 * rate(container_cpu_usage_seconds_total{pod=~"{{service_name}}-.*"}[5m])
  / container_spec_cpu_quota * container_spec_cpu_period

# Memory
container_memory_working_set_bytes{pod=~"{{service_name}}-.*"}
  / container_spec_memory_limit_bytes * 100
```

## Step 6: Interpret Results

Based on findings, determine if the issue is:
- **Traffic spike** — Rate anomaly without error increase
- **Cascading failure** — Error rate increase + latency spike
- **Resource saturation** — CPU/memory near limits
- **Downstream dependency** — Latency without local CPU/memory issue
