---
title: SLO Burn Rate Analysis
description: Compute error budget consumption — fast burn (1h) and slow burn (6h) with time-to-exhaustion forecast
category: metrics
datasources: [prometheus]
tags: [slo, error-budget, burn-rate, reliability, alerting]
---

# SLO Burn Rate Analysis

Computes multi-window burn rates for `{{service_name}}` with SLO target of `{{slo_target}}`%.

**Variables:**
- `{{service_name}}` — Service name (e.g. checkout, payment-api)
- `{{slo_target}}` — SLO target percentage (e.g. 99.9)
- `{{namespace}}` — Kubernetes namespace

---

## Step 1: Current Error Rate

Calculate the current error rate over the past 5 minutes:

```promql
sum(rate(http_requests_total{
  app="{{service_name}}",
  namespace="{{namespace}}",
  status=~"5.."
}[5m]))
/
sum(rate(http_requests_total{
  app="{{service_name}}",
  namespace="{{namespace}}"
}[5m]))
```

The allowable error rate for a `{{slo_target}}`% SLO:
```
error_rate_budget = (100 - {{slo_target}}) / 100
# e.g. 99.9% SLO → 0.001 (0.1%) allowed errors
```

---

## Step 2: Fast Burn Rate (1h Window)

Fast burn detects rapid budget consumption. Threshold: 14× for 99.9% SLO.

```promql
# 1-hour error ratio
sum(rate(http_requests_total{
  app="{{service_name}}",
  status=~"5.."
}[1h]))
/
sum(rate(http_requests_total{app="{{service_name}}"}[1h]))
```

**Burn rate formula:**
```
burn_rate = current_error_rate / allowed_error_rate

# Example: current 1.4%, SLO 99.9% (0.1% allowed)
# burn_rate = 1.4% / 0.1% = 14x
```

**Alert thresholds for 99.9% SLO:**
| Window | Burn Rate | Meaning |
|--------|-----------|---------|
| 1h | > 14× | 1h fast burn → page immediately |
| 6h | > 6× | Slow burn → ticket urgently |
| 1d | > 3× | Budget at risk → investigate |

---

## Step 3: Slow Burn Rate (6h Window)

Slow burn catches sustained low-level degradation that fast burn misses:

```promql
# 6-hour error ratio
sum(rate(http_requests_total{
  app="{{service_name}}",
  status=~"5.."
}[6h]))
/
sum(rate(http_requests_total{app="{{service_name}}"}[6h]))
```

```promql
# 1-day error ratio (budget health view)
sum(rate(http_requests_total{
  app="{{service_name}}",
  status=~"5.."
}[24h]))
/
sum(rate(http_requests_total{app="{{service_name}}"}[24h]))
```

**Combined alert expression (99.9% SLO):**
```promql
# Page if fast OR slow burn is too high
(
  sum(rate(http_requests_total{app="{{service_name}}",status=~"5.."}[1h]))
  / sum(rate(http_requests_total{app="{{service_name}}"}[1h]))
  > 14 * (1 - 0.999)
)
OR
(
  sum(rate(http_requests_total{app="{{service_name}}",status=~"5.."}[6h]))
  / sum(rate(http_requests_total{app="{{service_name}}"}[6h]))
  > 6 * (1 - 0.999)
)
```

---

## Step 4: Remaining Error Budget

Calculate how much error budget has been consumed in the current 30-day window:

```promql
# Total errors in 30 days
sum(increase(http_requests_total{
  app="{{service_name}}",
  status=~"5.."
}[30d]))
```

```promql
# Total requests in 30 days
sum(increase(http_requests_total{app="{{service_name}}"}[30d]))
```

**Budget calculation:**
```
monthly_request_volume = sum(increase(total[30d]))
budget_allowed = monthly_request_volume × (1 - {{slo_target}}/100)
budget_consumed = sum(increase(errors[30d]))
budget_remaining = budget_allowed - budget_consumed
budget_remaining_pct = budget_remaining / budget_allowed × 100
```

---

## Step 5: Time-to-Exhaustion Forecast

At the current burn rate, when will the budget be exhausted?

```promql
# Current burn multiplier (1h window)
(
  sum(rate(http_requests_total{app="{{service_name}}",status=~"5.."}[1h]))
  / sum(rate(http_requests_total{app="{{service_name}}"}[1h]))
) / (1 - {{slo_target}}/100)
```

**Time-to-exhaustion formula:**
```
tte_hours = budget_remaining_hours / burn_rate
# If burn_rate = 5×, remaining budget = 72h → TTE = 72/5 = 14.4 hours
```

**Recommended Grafana alert rules:**
```yaml
# prometheus-rules.yaml
groups:
- name: slo-{{service_name}}
  rules:
  - alert: HighErrorBudgetBurn
    expr: |
      (
        error_rate_1h / slo_budget > 14
        AND error_rate_5m / slo_budget > 14
      ) OR (
        error_rate_6h / slo_budget > 6
        AND error_rate_30m / slo_budget > 6
      )
    for: 2m
    labels:
      severity: critical
      service: {{service_name}}
    annotations:
      summary: "SLO budget burning fast for {{service_name}}"
      description: "Current burn rate will exhaust budget in {{ humanizeDuration $value }}"
```
