---
title: Log Error Analysis
description: Extract, count, and deduplicate top error patterns from application logs
category: logs
datasources: [loki]
tags: [logs, errors, patterns, debugging]
---

# Log Error Analysis

Systematically extracts, deduplicates, and ranks error patterns from application logs in Loki.
Produces a ranked digest of the top failure signatures driving incidents.

**Variables:**
- `{{service_name}}` — Application name as it appears in the `app` label (e.g. checkout, auth)
- `{{namespace}}` — Kubernetes namespace (e.g. production, default)
- `{{time_range}}` — LogQL time range window (e.g. 15m, 1h, 6h)
- `{{error_pattern}}` — Regex pattern for error lines (default: `ERROR|FATAL|panic|Exception`)

## Step 1: Extract All Errors

Pull raw error log lines with timestamps and structured fields for the investigation window.

```logql
{app="{{service_name}}", namespace="{{namespace}}"}
  |~ "{{error_pattern}}"
  | json
  | line_format "[{{.time}}] {{.level}} {{.msg}} caller={{.caller}}"
```

For non-JSON logs (logfmt or plaintext):
```logql
{app="{{service_name}}", namespace="{{namespace}}"}
  |~ "{{error_pattern}}"
  | logfmt
  | line_format "{{.ts}} {{.level}} {{.msg}}"
```

Quick volume check — how many error lines in the window:
```logql
count_over_time(
  {app="{{service_name}}", namespace="{{namespace}}"} |~ "{{error_pattern}}" [{{time_range}}]
)
```

## Step 2: Count Unique Error Patterns

Group errors by message to surface the highest-frequency failure signatures.

```logql
topk(10,
  sum by (msg) (
    count_over_time(
      {app="{{service_name}}", namespace="{{namespace}}"} |~ "{{error_pattern}}" | json [{{time_range}}]
    )
  )
)
```

Group by error code if the log schema includes one:
```logql
topk(10,
  sum by (error_code, msg) (
    count_over_time(
      {app="{{service_name}}"} |~ "{{error_pattern}}" | json [{{time_range}}]
    )
  )
)
```

Group by pod to detect if errors are isolated to a single instance:
```logql
sum by (pod) (
  count_over_time(
    {app="{{service_name}}", namespace="{{namespace}}"} |~ "{{error_pattern}}" [{{time_range}}]
  )
)
```

## Step 3: Find Error Rate Trend

Determine whether errors are growing, spiking, or decaying over time.

```logql
sum(rate({app="{{service_name}}", namespace="{{namespace}}"} |~ "{{error_pattern}}" [5m]))
```

Compare error rate now vs 1 hour ago:
```logql
# Current rate
sum(rate({app="{{service_name}}"} |~ "{{error_pattern}}" [5m]))

# Baseline (1h ago)
sum(rate({app="{{service_name}}"} |~ "{{error_pattern}}" [5m] offset 1h))
```

Break down by severity level to separate FATAL from ERROR from WARN:
```logql
sum by (level) (
  rate({app="{{service_name}}"} | json | level=~"error|fatal|warn" [5m])
)
```

## Step 4: Extract Stack Traces

Pull multi-line stack traces associated with the top error pattern for deep debugging.

```logql
{app="{{service_name}}", namespace="{{namespace}}"}
  |~ "{{error_pattern}}"
  | json
  | line_format "{{.stacktrace}}"
```

For Java/JVM services (multi-line exception grouping):
```logql
{app="{{service_name}}"} |~ "Exception|at " | json
```

For Go panic stack traces:
```logql
{app="{{service_name}}"} |~ "goroutine|panic:" | line_format "{{__line__}}"
```

Filter to only lines containing the most frequent error message from Step 2:
```logql
{app="{{service_name}}"} |= "{{top_error_message}}" | json
  | line_format "pod={{.pod}} ts={{.ts}} msg={{.msg}}"
```

## Step 5: Summarize Top 10 Error Patterns

Produce a final ranked summary table of unique error signatures with occurrence counts,
first-seen timestamp, and affected pod count.

```logql
# Unique error messages with first-seen timestamp
{app="{{service_name}}", namespace="{{namespace}}"} |~ "{{error_pattern}}" | json
  | label_format error_msg="msg"
  | first_over_time({error_msg}[{{time_range}}])
```

Compute ratio of error lines to total log lines (error density):
```logql
# Error line ratio
sum(rate({app="{{service_name}}"} |~ "{{error_pattern}}" [5m]))
/
sum(rate({app="{{service_name}}"} [5m]))
```

Generate final digest for incident report:
```logql
topk(10,
  sum by (level, msg, caller) (
    count_over_time(
      {app="{{service_name}}", namespace="{{namespace}}"}
        |~ "{{error_pattern}}"
        | json
        | keep level, msg, caller
        [{{time_range}}]
    )
  )
)
```

**Interpretation guide:**
- Top error appearing in > 80% of error lines = single dominant failure mode, start here
- Errors spread evenly across many messages = systemic degradation (infra issue likely)
- Errors isolated to one pod = pod-specific issue (bad deployment, node problem, OOMKill)
- Errors appearing only on specific endpoints = code path regression from recent deploy
