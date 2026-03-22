/**
 * Estimate token count for a string.
 * Approximation: ~4 characters per token for English text.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Format token count as string with K suffix if large.
 */
export function formatTokenCount(tokens: number): string {
  if (tokens < 1000) return `${tokens} tokens`
  return `${(tokens / 1000).toFixed(1)}K tokens`
}

/**
 * Estimate tokens for a message array.
 */
export function estimateMessagesTokens(messages: Array<{ content: string }>): number {
  return messages.reduce((sum, m) => sum + estimateTokens(m.content) + 4, 0) // 4 for message overhead
}
