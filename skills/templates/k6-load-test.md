---
title: k6 Load Test Analysis
description: Analyze k6 performance test results, identify regressions, recommend thresholds
category: general
datasources: [prometheus, loki]
tags: [k6, load-test, performance, thresholds]
---

# k6 Load Test Analysis

Evaluates k6 load test results from Prometheus metrics, identifies performance regressions
against baseline runs, surfaces error clusters from logs, and recommends production SLO thresholds.

**Variables:**
- `{{test_name}}` — k6 test scenario name (e.g. checkout-stress, api-smoke)
- `{{baseline_vus}}` — Number of virtual users in the baseline run (e.g. 50)
- `{{target_vus}}` — Number of virtual users in the current run (e.g. 200)
- `{{service_name}}` — Backend service under test (e.g. checkout, api-gateway)
- `{{time_range}}` — Duration of the test run (e.g. 10m, 30m)

## Step 1: Fetch k6 Metrics from Prometheus

k6 emits metrics to Prometheus via the remote write output or the k6 Prometheus extension.
Pull the primary performance metrics for the test run.

```promql
# HTTP request duration — P95 across all requests
histogram_quantile(0.95,
  sum by (le) (
    rate(k6_http_req_duration_bucket{testid="{{test_name}}"}[1m])
  )
)
```

```promql
# HTTP request duration — P99
histogram_quantile(0.99,
  sum by (le) (
    rate(k6_http_req_duration_bucket{testid="{{test_name}}"}[1m])
  )
)
```

```promql
# HTTP error rate (status >= 400)
sum(rate(k6_http_req_failed_total{testid="{{test_name}}"}[1m]))
  /
sum(rate(k6_http_reqs_total{testid="{{test_name}}"}[1m]))
```

```promql
# Requests per second (throughput)
sum(rate(k6_http_reqs_total{testid="{{test_name}}"}[1m]))
```

```promql
# Active virtual user count over time
k6_vus{testid="{{test_name}}"}
```

```promql
# Connection wait time (server accept latency)
histogram_quantile(0.99,
  rate(k6_http_req_connecting_bucket{testid="{{test_name}}"}[1m])
)
```

## Step 2: Compare P95/P99 to Baseline

Quantify latency regression by comparing the current run against the established baseline.

```promql
# Current run P99
histogram_quantile(0.99,
  sum by (le) (rate(k6_http_req_duration_bucket{testid="{{test_name}}"}[1m]))
)

# Baseline run P99 (use baseline test name or time offset)
histogram_quantile(0.99,
  sum by (le) (rate(k6_http_req_duration_bucket{testid="{{test_name}}-baseline"}[1m]))
)
```

Compute regression ratio (current P99 / baseline P99):
```promql
(
  histogram_quantile(0.99,
    sum by (le) (rate(k6_http_req_duration_bucket{testid="{{test_name}}"}[1m]))
  )
)
/
(
  histogram_quantile(0.99,
    sum by (le) (rate(k6_http_req_duration_bucket{testid="{{test_name}}-baseline"}[1m]))
  )
)
```

A ratio > 1.2 (20% regression) is significant. A ratio > 2.0 requires immediate investigation.

Check if throughput also degraded (saturation point detection):
```promql
# VU ramp-up vs RPS: if RPS plateaus while VUs keep growing, service hit saturation
k6_vus{testid="{{test_name}}"}
sum(rate(k6_http_reqs_total{testid="{{test_name}}"}[1m]))
```

## Step 3: Find Failed Requests in Logs

Correlate k6 test errors with application-side log entries to identify the exact failure mode.

```logql
{app="{{service_name}}"} |~ "ERROR|5[0-9][0-9]|timeout|refused"
  | json
  | line_format "{{.ts}} {{.level}} {{.msg}} status={{.status_code}}"
```

Filter to only the test window (align time range with test start/end):
```logql
{app="{{service_name}}", namespace="production"}
  |~ "ERROR|FATAL"
  | json
  | line_format "{{.time}} {{.msg}} trace_id={{.trace_id}}"
```

Group errors by type to find the dominant failure signature:
```logql
topk(10,
  sum by (msg) (
    count_over_time(
      {app="{{service_name}}"} |~ "ERROR" | json [{{time_range}}]
    )
  )
)
```

Look for timeout errors specifically (common under load):
```logql
{app="{{service_name}}"} |~ "context deadline exceeded|timeout|read tcp"
  | json
  | line_format "{{.ts}} {{.msg}} duration={{.duration}}"
```

## Step 4: Check Resource Saturation During Test

Determine whether the service ran out of CPU, memory, or file descriptors under the target VU load.

```promql
# CPU utilization during test window
rate(container_cpu_usage_seconds_total{pod=~"{{service_name}}-.*"}[1m])
  / on(pod) kube_pod_container_resource_limits{resource="cpu", pod=~"{{service_name}}-.*"}
  * 100
```

```promql
# CPU throttling — percentage of time CPU was throttled
rate(container_cpu_cfs_throttled_seconds_total{pod=~"{{service_name}}-.*"}[1m])
  /
rate(container_cpu_cfs_periods_total{pod=~"{{service_name}}-.*"}[1m])
  * 100
```

```promql
# Memory usage vs limit
container_memory_working_set_bytes{pod=~"{{service_name}}-.*"}
  / container_spec_memory_limit_bytes{pod=~"{{service_name}}-.*"}
  * 100
```

```promql
# Number of Go goroutines (detect goroutine leak under load)
go_goroutines{app="{{service_name}}"}
```

```promql
# Open file descriptors (approaching OS limit = risk of "too many open files")
process_open_fds{app="{{service_name}}"}
  / process_max_fds{app="{{service_name}}"}
  * 100
```

Check if HPA scaled during the test (indicates the service needed more instances):
```promql
kube_horizontalpodautoscaler_status_current_replicas{
  horizontalpodautoscaler=~"{{service_name}}.*"
}
```

## Step 5: Recommend SLO Thresholds

Based on the measured performance profile, derive recommended SLO thresholds and k6 pass/fail criteria.

Current measured values (from Step 1 and 2):
```promql
# Stable P50 under target load
histogram_quantile(0.50,
  sum by (le) (rate(k6_http_req_duration_bucket{testid="{{test_name}}"}[1m]))
)

# Stable P95 under target load
histogram_quantile(0.95,
  sum by (le) (rate(k6_http_req_duration_bucket{testid="{{test_name}}"}[1m]))
)

# Maximum sustained error rate under target load
max_over_time(
  (
    sum(rate(k6_http_req_failed_total{testid="{{test_name}}"}[1m]))
    /
    sum(rate(k6_http_reqs_total{testid="{{test_name}}"}[1m]))
  )[{{time_range}}:1m]
)
```

**Recommended k6 thresholds block** (add to test script):
```javascript
export const options = {
  thresholds: {
    // P95 must stay under 1.5x the measured stable P95
    'http_req_duration{testid:{{test_name}}}': ['p(95)<{measured_p95_ms * 1.5}'],
    // P99 must stay under 2x the measured stable P99
    'http_req_duration{testid:{{test_name}}}': ['p(99)<{measured_p99_ms * 2}'],
    // Error rate must stay under 0.1%
    'http_req_failed': ['rate<0.001'],
  },
  vus: {{target_vus}},
  duration: '{{time_range}}',
};
```

**SLO recommendation table:**

| Signal | Measured (p95) | Measured (p99) | Recommended SLO |
|--------|---------------|---------------|-----------------|
| Latency | `<measured>` | `<measured>` | p99 < measured * 1.5 |
| Error rate | `<measured>` | — | < 0.1% |
| Throughput | `<measured rps>` | — | > baseline rps |

**Saturation point identification:**
- If P99 doubles between {{baseline_vus}} and {{target_vus}} VUs, the saturation point is between those levels
- Run binary search (e.g. 100, 150, 175 VUs) to pinpoint the exact inflection point
- Set production HPA max replicas so saturation point is never reached at peak traffic
