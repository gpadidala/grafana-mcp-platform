---
title: Database Slow Query Investigation
description: Identify slow SQL queries, index gaps, lock waits, and connection pool saturation
category: investigation
datasources: [loki, prometheus, tempo]
tags: [database, sql, slow-query, performance]
---

# Database Slow Query Investigation

Identifies the specific SQL queries responsible for database latency, surfaces missing indexes,
detects lock contention, and diagnoses connection pool exhaustion causing application timeouts.

**Variables:**
- `{{db_instance}}` — Database instance label (e.g. postgres-primary, mysql-orders)
- `{{service_name}}` — Application service querying the database (e.g. checkout, user-service)
- `{{threshold_ms}}` — Slow query threshold in milliseconds (e.g. 500, 1000)
- `{{namespace}}` — Kubernetes namespace (e.g. production)
- `{{time_range}}` — Investigation window (e.g. 30m, 1h)

## Step 1: Find Slow Queries in Database Logs

Pull slow query log entries from Loki. Databases log queries exceeding the configured
`log_min_duration_statement` (Postgres) or `long_query_time` (MySQL) threshold.

For PostgreSQL slow query logs:
```logql
{app="{{db_instance}}", namespace="{{namespace}}"}
  |~ "duration:"
  | logfmt
  | duration > {{threshold_ms}}ms
  | line_format "duration={{.duration}} sql={{.statement}}"
```

For MySQL slow query logs:
```logql
{app="{{db_instance}}"} |~ "Query_time"
  | regexp "Query_time: (?P<query_time>[0-9.]+)"
  | query_time > {{threshold_ms / 1000}}
```

Find the top-10 slowest query signatures (normalised, without literal values):
```logql
topk(10,
  sum by (statement) (
    count_over_time(
      {app="{{db_instance}}"} |~ "duration:" | logfmt | duration > {{threshold_ms}}ms [{{time_range}}]
    )
  )
)
```

Detect any full-table scans logged as sequential scans (PostgreSQL):
```logql
{app="{{db_instance}}"} |~ "Seq Scan|seq scan" | logfmt
  | line_format "table={{.relation}} rows={{.rows}} cost={{.actual_total_time}}"
```

## Step 2: Check Query Execution Time from Traces

Use Tempo to find the exact slow database spans from the application side,
with the SQL statement captured as a span attribute.

```traceql
{ .db.system = "postgresql" && .service.name = "{{service_name}}" && duration > {{threshold_ms}}ms }
  | select(duration, .db.statement, .db.operation, .db.name, .peer.service)
```

For MySQL:
```traceql
{ .db.system = "mysql" && .service.name = "{{service_name}}" && duration > {{threshold_ms}}ms }
  | select(duration, .db.statement, .db.operation, .db.name)
```

Find the single worst query by maximum duration:
```traceql
max(duration) { .db.system != nil && .service.name = "{{service_name}}" }
```

Group slow DB spans by normalised query to find the most frequently slow statement:
```traceql
{ .db.system != nil && .service.name = "{{service_name}}" && duration > {{threshold_ms}}ms }
  | select(duration, .db.statement, .db.operation)
```

## Step 3: Monitor Connection Pool

Connection pool exhaustion causes requests to queue, producing timeout errors that appear as
latency spikes in the application layer before the DB itself is even slow.

```promql
# Active connections vs pool maximum
db_pool_connections_active{app="{{service_name}}"}
  / db_pool_connections_max{app="{{service_name}}"}
```

```promql
# Idle connections (high idle = pool correctly sized, 0 idle = pool exhausted)
db_pool_connections_idle{app="{{service_name}}"}
```

```promql
# Connection wait time — how long requests queue for a connection
histogram_quantile(0.99,
  rate(db_pool_wait_duration_seconds_bucket{app="{{service_name}}"}[5m])
)
```

```promql
# Connection acquisition timeout rate (requests failing to get a connection)
rate(db_pool_connection_timeouts_total{app="{{service_name}}"}[5m])
```

Check the number of open server-side connections (requires pg_stat_activity exporter):
```promql
# PostgreSQL server-side active connections
pg_stat_activity_count{datname="{{db_name}}", state="active"}
pg_stat_activity_count{datname="{{db_name}}", state="idle in transaction"}
pg_stat_activity_count{datname="{{db_name}}", state="idle"}
```

## Step 4: Check Lock Waits

Lock contention causes cascading slowdowns — one long-running transaction blocks all others
trying to write to the same rows or tables.

```promql
# PostgreSQL lock waits per second
rate(pg_locks_count{datname="{{db_name}}", mode="RowExclusiveLock", granted="false"}[5m])
```

```promql
# Deadlock frequency
rate(pg_stat_database_deadlocks_total{datname="{{db_name}}"}[5m])
```

```promql
# Longest running transaction (requires pg_stat_activity)
pg_stat_activity_max_tx_duration{datname="{{db_name}}", state="idle in transaction"}
```

Find which query is holding locks in the slow query logs:
```logql
{app="{{db_instance}}"} |~ "lock wait|deadlock|ERROR.*lock"
  | logfmt
  | line_format "{{.ts}} pid={{.pid}} msg={{.message}}"
```

For MySQL InnoDB lock waits:
```logql
{app="{{db_instance}}"} |~ "InnoDB.*lock|WAITING FOR THIS LOCK"
  | line_format "{{__line__}}"
```

## Step 5: Identify Missing Indexes

Missing indexes force full table scans and are the most common cause of slow queries
that were fast at lower data volumes.

Check index usage statistics (requires pg_stat_user_tables):
```promql
# Tables with high sequential scan rate (candidates for index)
rate(pg_stat_user_tables_seq_scan{datname="{{db_name}}"}[5m])
  > rate(pg_stat_user_tables_idx_scan{datname="{{db_name}}"}[5m])
```

```promql
# Total sequential scan rows fetched (large number = expensive full table scan)
rate(pg_stat_user_tables_seq_tup_read{datname="{{db_name}}"}[5m])
```

Detect EXPLAIN plan evidence of missing index in slow query logs:
```logql
{app="{{db_instance}}"} |~ "Seq Scan|bitmap heap scan|rows=.*cost="
  | logfmt
  | line_format "plan={{.message}}"
```

Check existing index hit ratio (should be > 99% for OLTP workloads):
```promql
(
  sum(pg_stat_user_tables_idx_tup_fetch{datname="{{db_name}}"})
)
/
(
  sum(pg_stat_user_tables_idx_tup_fetch{datname="{{db_name}}"})
  + sum(pg_stat_user_tables_seq_tup_read{datname="{{db_name}}"})
)
```

## Step 6: Recommend Fixes

Based on findings from Steps 1-5, apply the appropriate remediation.

**Connection pool exhaustion:**
- Increase pool size if DB server has headroom: `max_connections` vs current usage
- Reduce connection hold time: ensure transactions are short-lived, avoid open transactions in application logic
- Add a PgBouncer connection pooler between application and Postgres

**Slow query / missing index:**
- Run EXPLAIN ANALYZE on the identified slow query in a read replica to get the execution plan
- Add an index on the filter column(s): `CREATE INDEX CONCURRENTLY idx_{{table}}_{{column}} ON {{table}}({{column}})`
- For queries with multiple filter conditions, consider a composite index

**Lock contention:**
- Identify and kill the blocking long-running transaction: `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction' AND now() - xact_start > interval '5 minutes'`
- Add application-level retry with exponential backoff for deadlock errors
- Refactor transaction ordering to acquire locks in a consistent order

**High read load:**
```promql
# Check if read replica lag is acceptable (if replicas are in use)
pg_replication_lag{instance=~"{{db_instance}}-replica.*"}
```
- Route read-only queries to replicas
- Add a caching layer (Redis) for hot read paths
