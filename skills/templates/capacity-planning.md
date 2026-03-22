---
title: Capacity Planning Analysis
description: CPU/memory saturation trends, HPA headroom, and scale-up recommendations with 7-day forecast
category: metrics
datasources: [prometheus, kubernetes]
tags: [capacity, scaling, hpa, resources, planning, infrastructure]
---

# Capacity Planning Analysis

Analyzes resource saturation and scaling headroom for `{{service_name}}` in `{{namespace}}` with a `{{forecast_days}}`-day forecast.

**Variables:**
- `{{service_name}}` — Service/deployment name
- `{{namespace}}` — Kubernetes namespace
- `{{forecast_days}}` — Forecast horizon in days (default: 7)

---

## Step 1: Current CPU and Memory Utilization with Trend

**CPU utilization per pod:**
```promql
# Current CPU % per pod
100 * rate(container_cpu_usage_seconds_total{
  namespace="{{namespace}}",
  pod=~"{{service_name}}-.*",
  container!="POD",
  container!=""
}[5m])
/ on (pod, container)
container_spec_cpu_quota{namespace="{{namespace}}", pod=~"{{service_name}}-.*"}
* container_spec_cpu_period{namespace="{{namespace}}", pod=~"{{service_name}}-.*"}
```

**Memory utilization % vs limit:**
```promql
100 * container_memory_working_set_bytes{
  namespace="{{namespace}}",
  pod=~"{{service_name}}-.*",
  container!="POD"
}
/ container_spec_memory_limit_bytes{
  namespace="{{namespace}}",
  pod=~"{{service_name}}-.*",
  container!="POD"
}
```

**7-day p95 CPU (baseline for request sizing):**
```promql
quantile_over_time(0.95,
  rate(container_cpu_usage_seconds_total{
    namespace="{{namespace}}",
    pod=~"{{service_name}}-.*",
    container!="POD"
  }[5m])[7d:5m]
)
```

---

## Step 2: HPA Status — Current vs Max Replicas

```promql
# Current replica count
kube_deployment_status_replicas{
  namespace="{{namespace}}",
  deployment="{{service_name}}"
}
```

```promql
# HPA current vs max
kube_horizontalpodautoscaler_status_current_replicas{
  namespace="{{namespace}}",
  horizontalpodautoscaler=~"{{service_name}}.*"
}

kube_horizontalpodautoscaler_spec_max_replicas{
  namespace="{{namespace}}",
  horizontalpodautoscaler=~"{{service_name}}.*"
}
```

**Headroom calculation:**
```
headroom_replicas = max_replicas - current_replicas
headroom_pct = (max_replicas - current_replicas) / max_replicas × 100
```

**Warning:** If headroom < 20%, increase `maxReplicas` or provision more node capacity.

---

## Step 3: Resource Request vs Actual Usage (Right-Sizing)

Under-requested resources cause OOM kills. Over-requested resources waste money.

**CPU request vs actual (VPA-style):**
```promql
# Actual CPU (p95 over 7 days)
quantile_over_time(0.95,
  rate(container_cpu_usage_seconds_total{
    namespace="{{namespace}}",
    pod=~"{{service_name}}-.*",
    container!="POD"
  }[5m])[7d:5m]
)

# Configured CPU request (in cores)
kube_pod_container_resource_requests{
  namespace="{{namespace}}",
  pod=~"{{service_name}}-.*",
  resource="cpu",
  unit="core"
}
```

**Memory request vs actual:**
```promql
# p99 memory (for limit sizing)
quantile_over_time(0.99,
  container_memory_working_set_bytes{
    namespace="{{namespace}}",
    pod=~"{{service_name}}-.*",
    container!="POD"
  }[7d:5m]
)

# Configured memory request (in bytes)
kube_pod_container_resource_requests{
  namespace="{{namespace}}",
  pod=~"{{service_name}}-.*",
  resource="memory"
}
```

**Right-sizing formula:**
```
new_cpu_request = p95_actual_cpu × 1.1   (10% headroom)
new_cpu_limit   = p99_actual_cpu × 1.5   (50% burst headroom)
new_mem_request = p95_actual_mem × 1.1
new_mem_limit   = p99_actual_mem × 1.25  (25% headroom above p99)
```

---

## Step 4: 7-Day Growth Forecast

Use linear regression over the past 30 days to forecast resource needs:

**Predict CPU needs in {{forecast_days}} days:**
```promql
predict_linear(
  sum(rate(container_cpu_usage_seconds_total{
    namespace="{{namespace}}",
    pod=~"{{service_name}}-.*",
    container!="POD"
  }[1h]))[30d:1h],
  {{forecast_days}} * 86400
)
```

**Predict memory needs in {{forecast_days}} days:**
```promql
predict_linear(
  avg(container_memory_working_set_bytes{
    namespace="{{namespace}}",
    pod=~"{{service_name}}-.*",
    container!="POD"
  })[30d:1h],
  {{forecast_days}} * 86400
)
```

**Replica forecast:**
```promql
predict_linear(
  kube_deployment_status_replicas{
    namespace="{{namespace}}",
    deployment="{{service_name}}"
  }[30d:1h],
  {{forecast_days}} * 86400
)
```

---

## Step 5: Scaling Recommendations

Based on the analysis above, generate actionable recommendations:

**Node capacity check:**
```promql
# Available allocatable CPU per node
kube_node_status_allocatable{resource="cpu", unit="core"}
- kube_node_status_capacity{resource="cpu", unit="core"}
+ kube_node_resource_capacity_annotation{resource="cpu"}
```

**Recommendations checklist:**
1. **Right-size requests/limits** — Set based on p95/p99 actual usage
2. **HPA scaling thresholds** — Target 60-70% CPU, 75% memory
3. **Pod disruption budget** — Ensure `minAvailable: 1` or `maxUnavailable: 1`
4. **Node capacity** — Provision new nodes if all headroom < 20%
5. **Cluster autoscaler** — Enable if not already active

**Example updated Deployment snippet:**
```yaml
resources:
  requests:
    cpu: "{{cpu_request_recommendation}}"
    memory: "{{memory_request_recommendation}}"
  limits:
    cpu: "{{cpu_limit_recommendation}}"
    memory: "{{memory_limit_recommendation}}"
```

**HPA configuration:**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{service_name}}-hpa
  namespace: {{namespace}}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{service_name}}
  minReplicas: 2
  maxReplicas: {{forecast_max_replicas}}
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 65
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 75
```
