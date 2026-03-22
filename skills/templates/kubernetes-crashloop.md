---
title: Kubernetes CrashLoop Investigation
description: Diagnose OOMKilled, CrashLoopBackOff pods from K8s events, resource metrics, and logs
category: investigation
datasources: [prometheus, loki, kubernetes]
tags: [kubernetes, crashloop, oomkilled, pods, k8s, containers]
---

# Kubernetes CrashLoop Investigation

Diagnoses why pods in the `{{namespace}}` namespace for `{{deployment_name}}` are crashing.

**Variables:**
- `{{namespace}}` — Kubernetes namespace (e.g. production, default)
- `{{deployment_name}}` — Deployment name (e.g. checkout, auth-service)
- `{{time_range}}` — Look-back window (default: 1h)

---

## Step 1: Get Pod Events and Restart Count

Query pod restart metrics from Prometheus:

```promql
# Restart count for the deployment pods
kube_pod_container_status_restarts_total{
  namespace="{{namespace}}",
  pod=~"{{deployment_name}}-.*"
}
```

Get the most recently restarted pod:
```promql
topk(1,
  increase(kube_pod_container_status_restarts_total{
    namespace="{{namespace}}",
    pod=~"{{deployment_name}}-.*"
  }[{{time_range}}])
)
```

Check Kubernetes events for OOMKilled or CrashLoopBackOff reason. Look for:
- `OOMKilled` → Memory limit breached
- `CrashLoopBackOff` → Application crash (check exit code)
- `Error` → Generic crash (check logs for exception)

---

## Step 2: Identify OOMKilled Reason

Check if pods are being OOM-killed by the kernel:

```promql
# Memory working set vs limit
container_memory_working_set_bytes{
  namespace="{{namespace}}",
  pod=~"{{deployment_name}}-.*"
}
/
container_spec_memory_limit_bytes{
  namespace="{{namespace}}",
  pod=~"{{deployment_name}}-.*"
} * 100
```

**Threshold:** > 90% → Near OOM. > 100% → OOM kill imminent.

Also check:
```promql
# RSS memory (actual physical RAM used)
container_memory_rss{
  namespace="{{namespace}}",
  pod=~"{{deployment_name}}-.*"
}
```

If exit code is `137` → Signal 9 (SIGKILL) = OOMKilled confirmed.

---

## Step 3: Memory Usage Trend (Is It a Leak?)

Plot memory over the past `{{time_range}}` to detect a memory leak pattern:

```promql
container_memory_working_set_bytes{
  namespace="{{namespace}}",
  pod=~"{{deployment_name}}-.*",
  container!="POD"
}
```

**Pattern analysis:**
- **Steady climb then crash** → Memory leak
- **Sudden spike then crash** → Large object allocation or traffic spike
- **Flat then crash** → Misconfigured limit (too low)

Check if memory limit is set:
```promql
container_spec_memory_limit_bytes{
  namespace="{{namespace}}",
  pod=~"{{deployment_name}}-.*"
}
```
If result is `0` → No limit set (unbounded memory use).

---

## Step 4: CPU Throttling Check

CPU throttling can cause timeouts that look like crashes:

```promql
# CPU throttling ratio (> 25% = problem)
rate(container_cpu_cfs_throttled_seconds_total{
  namespace="{{namespace}}",
  pod=~"{{deployment_name}}-.*"
}[5m])
/
rate(container_cpu_cfs_periods_total{
  namespace="{{namespace}}",
  pod=~"{{deployment_name}}-.*"
}[5m])
```

CPU request vs actual:
```promql
rate(container_cpu_usage_seconds_total{
  namespace="{{namespace}}",
  pod=~"{{deployment_name}}-.*",
  container!="POD"
}[5m])
```

---

## Step 5: Application Logs Before Crash

Fetch logs from Loki in the 5 minutes before the last crash:

```logql
{namespace="{{namespace}}", pod=~"{{deployment_name}}-.*"}
  |~ "ERROR|FATAL|panic|out of memory|OOM|killed|signal"
  | json
```

Look for:
- `signal: killed` → OOM kill from outside the container
- `runtime: out of memory` → Go OOM panic
- `java.lang.OutOfMemoryError` → Java OOM
- `Segmentation fault` → Native crash
- Application exception stack traces

---

## Step 6: Recommend Resource Limits

Based on observed peak memory and CPU, recommend new resource limits:

**Memory recommendation:**
- Set `requests` = p95 observed memory
- Set `limits` = p99 observed memory × 1.25 (25% headroom)

**CPU recommendation:**
- Set `requests` = average CPU usage
- Set `limits` = 2-4× peak CPU (avoid throttling)

**Example manifest patch:**
```yaml
resources:
  requests:
    memory: "256Mi"   # p95 observed
    cpu: "250m"       # average observed
  limits:
    memory: "512Mi"   # p99 × 1.25
    cpu: "1000m"      # peak × 2
```

**HPA recommendation (if not already set):**
- Add HPA targeting 70% CPU or 80% memory
- Set `minReplicas: 2` to avoid single-pod SPOF
