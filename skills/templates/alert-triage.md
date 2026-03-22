---
title: Alert Triage
description: Prometheus alert → log correlation → root cause → remediation playbook
category: investigation
datasources: [prometheus, loki, tempo, grafana]
tags: [alert, triage, oncall, incident]
---

# Alert Triage

Systematic triage playbook for a firing Prometheus or Grafana alert. Walks from raw alert
context through metric verification, log correlation, trace root cause, and remediation.

**Variables:**
- `{{alert_name}}` — Alertmanager alert name (e.g. HighErrorRate, PodCrashLooping)
- `{{service_name}}` — Affected service name (e.g. checkout, payment)
- `{{namespace}}` — Kubernetes namespace (e.g. production, staging)
- `{{time_range}}` — Investigation window (default: 30m)
- `{{severity}}` — Alert severity label (e.g. critical, warning)

## Step 1: Fetch Alert Details from Alertmanager

Retrieve the full alert context including labels, annotations, and firing duration.

```promql
# Confirm alert is actively firing
ALERTS{alertname="{{alert_name}}", severity="{{severity}}", namespace="{{namespace}}"}
```

Query Grafana Alertmanager API for enriched context:
```
GET /api/alertmanager/grafana/api/v2/alerts?filter=alertname={{alert_name}}&active=true
```

Expected fields to capture:
- `startsAt` — When the alert first fired (anchor for time window)
- `labels` — All key/value labels (service, pod, environment)
- `annotations.summary` — Human-readable alert description
- `annotations.runbook_url` — Link to runbook if defined

Check for correlated alerts firing within the same 5-minute window:
```promql
count by (alertname) (
  ALERTS{namespace="{{namespace}}", severity=~"critical|warning"}
)
```

## Step 2: Query the Metric That Triggered the Alert

Reproduce the alert condition to confirm it is still active and understand its magnitude.

```promql
# Generic: adapt the expression from the alert rule definition
rate(http_requests_total{app="{{service_name}}",namespace="{{namespace}}",status=~"5.."}[5m])
  /
rate(http_requests_total{app="{{service_name}}",namespace="{{namespace}}"}[5m])
```

Compare current value against the alert threshold:
```promql
# Current error rate vs 1h baseline
(
  rate(http_requests_total{app="{{service_name}}",status=~"5.."}[5m])
  /
  rate(http_requests_total{app="{{service_name}}"}[5m])
)
/
(
  rate(http_requests_total{app="{{service_name}}",status=~"5.."}[5m] offset 1h)
  /
  rate(http_requests_total{app="{{service_name}}"}[5m] offset 1h)
)
```

Check for recent deployment or config change annotation:
```
GET /api/annotations?from={{alert_start_unix_ms}}&to=now&tags=deployment&tags={{service_name}}
```

## Step 3: Correlate with Loki Logs

Pull structured logs from the service in the window around alert firing time.

```logql
{app="{{service_name}}", namespace="{{namespace}}"}
  |~ "ERROR|FATAL|panic|exception|timeout|refused"
  | json
  | line_format "[{{.level}}] {{.msg}} caller={{.caller}}"
```

Count distinct error signatures to find the dominant failure mode:
```logql
topk(10,
  sum by (msg) (
    count_over_time(
      {app="{{service_name}}", namespace="{{namespace}}"} |~ "ERROR" | json [{{time_range}}]
    )
  )
)
```

Look for upstream dependency errors (connection refused, dial timeout):
```logql
{app="{{service_name}}"} |~ "connection refused|dial tcp|context deadline exceeded|i/o timeout"
  | json
  | line_format "{{.ts}} {{.msg}} target={{.target}}"
```

## Step 4: Check Traces for Root Cause

Use Tempo TraceQL to find the slowest or errored requests during the alert window.

```traceql
{ .service.name = "{{service_name}}" && status = error }
  | select(duration, rootName, rootServiceName)
```

Find the span contributing the most latency:
```traceql
{ .service.name = "{{service_name}}" && duration > 2s }
  | select(duration, name, .db.statement, .http.url)
```

Identify which downstream service is the bottleneck:
```traceql
{ rootServiceName = "{{service_name}}" }
  | select(duration, nestedSetParent, .peer.service)
```

Pull the single slowest trace by ID for waterfall inspection:
```
GET /api/traces/{trace_id}
```

## Step 5: Suggest Remediation

Based on evidence gathered in Steps 1-4, apply the appropriate remediation path.

**If root cause = downstream dependency failure:**
- Check if target service is healthy: re-run health-check.md for the dependency
- Verify circuit breaker state in metrics:
  ```promql
  circuit_breaker_state{service="{{service_name}}", target=~".+"}
  ```
- Enable fallback or static response if available

**If root cause = traffic spike beyond capacity:**
```promql
# Current replica count vs HPA max
kube_horizontalpodautoscaler_status_current_replicas{namespace="{{namespace}}", horizontalpodautoscaler=~"{{service_name}}.*"}
kube_horizontalpodautoscaler_spec_max_replicas{namespace="{{namespace}}", horizontalpodautoscaler=~"{{service_name}}.*"}
```
- Manually scale if HPA is at max: `kubectl scale deployment/{{service_name}} --replicas=N -n {{namespace}}`

**If root cause = bad deployment:**
- Identify offending commit via Grafana annotation from Step 1
- Rollback: `kubectl rollout undo deployment/{{service_name}} -n {{namespace}}`
- Confirm rollback health: re-run Step 2 after 2 minutes

**If root cause = database overload:**
- Proceed to db-slow-query.md investigation template
- Check connection pool saturation:
  ```promql
  db_pool_connections_active{app="{{service_name}}"}
    / db_pool_connections_max{app="{{service_name}}"}
  ```

**Final checklist before closing alert:**
- [ ] Metric has returned below threshold
- [ ] Error log rate has dropped to baseline
- [ ] No new correlated alerts firing
- [ ] Incident document updated with timeline and root cause
