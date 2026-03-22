/**
 * Format bytes to human-readable string.
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const dm = Math.max(0, decimals)
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

/**
 * Format duration in milliseconds to human-readable string.
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`
  return `${Math.floor(ms / 3_600_000)}h ${Math.floor((ms % 3_600_000) / 60_000)}m`
}

/**
 * Format a number with SI suffixes (1K, 2.3M, etc.)
 */
export function formatNumber(n: number, decimals = 1): string {
  if (n < 1000) return n.toString()
  if (n < 1_000_000) return `${(n / 1000).toFixed(decimals)}K`
  if (n < 1_000_000_000) return `${(n / 1_000_000).toFixed(decimals)}M`
  return `${(n / 1_000_000_000).toFixed(decimals)}B`
}

/**
 * Format a Unix timestamp (seconds) to local date/time string.
 */
export function formatTimestamp(ts: number, options?: Intl.DateTimeFormatOptions): string {
  const ms = ts > 1e12 ? ts : ts * 1000
  return new Date(ms).toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    ...options,
  })
}

/**
 * Format a percentage with fixed decimals.
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * Format a rate value with appropriate unit.
 */
export function formatRate(rps: number): string {
  if (rps < 1) return `${(rps * 1000).toFixed(1)}/min`
  return `${rps.toFixed(1)}/s`
}
