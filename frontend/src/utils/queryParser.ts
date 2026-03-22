type QueryLanguage = 'promql' | 'logql' | 'traceql' | 'sql' | 'unknown'

/**
 * Detect the likely query language from query string.
 */
export function detectQueryLanguage(query: string): QueryLanguage {
  const q = query.trim().toLowerCase()

  // PromQL patterns
  if (/rate\s*\(|histogram_quantile|increase\s*\(|irate\s*\(|avg_over_time|sum\s*by\s*\(/.test(q)) {
    return 'promql'
  }

  // LogQL patterns — starts with { and uses | operators
  if (/^\{[^}]+\}/.test(q) || /\|\s*(json|logfmt|regexp|pattern|line_format|label_format)\b/.test(q)) {
    return 'logql'
  }

  // TraceQL patterns
  if (/\{\s*\.(service\.name|span\.name|duration|status)\s*/.test(q) || /spanset\s*\{/.test(q)) {
    return 'traceql'
  }

  // SQL patterns
  if (/^\s*(select|with|insert|update|delete|explain)\s+/i.test(query)) {
    return 'sql'
  }

  return 'unknown'
}

/**
 * Extract service names from a PromQL query.
 */
export function extractServicesFromPromQL(query: string): string[] {
  const matches = query.matchAll(/app\s*=\s*["']([^"']+)["']/g)
  return [...matches].map((m) => m[1])
}

/**
 * Check if a query looks like a complete expression vs a partial one.
 */
export function isCompleteQuery(query: string, lang: QueryLanguage): boolean {
  if (!query.trim()) return false

  // Check balanced braces/parens
  let depth = 0
  for (const ch of query) {
    if (ch === '{' || ch === '(') depth++
    if (ch === '}' || ch === ')') depth--
    if (depth < 0) return false
  }

  if (lang === 'promql') {
    // PromQL is complete if we have at least a metric name + braces
    return /\w+(\{[^}]*\})?/.test(query) && depth === 0
  }

  if (lang === 'logql') {
    return /\{[^}]+\}/.test(query) && depth === 0
  }

  return depth === 0
}
