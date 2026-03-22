import {
  Component,
  type ReactNode,
  type ErrorInfo,
} from 'react'
import { AlertTriangle, RefreshCw, Copy } from 'lucide-react'

// ── Error display card ────────────────────────────────────────────────────────

interface ErrorCardProps {
  error: Error | null
  onReset: () => void
}

function ErrorCard({ error, onReset }: ErrorCardProps) {
  const copyError = () => {
    const text = [error?.message, error?.stack].filter(Boolean).join('\n\n')
    navigator.clipboard.writeText(text).catch(() => {/* silently ignore */})
  }

  return (
    <div
      className="flex flex-col gap-3 p-4 rounded-xl"
      style={{
        background: 'rgba(242,73,92,0.06)',
        border:     '1px solid rgba(242,73,92,0.25)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <AlertTriangle
          className="w-4 h-4 flex-shrink-0"
          style={{ color: 'var(--color-error)' }}
        />
        <span className="text-sm font-semibold text-text-primary">
          Something went wrong
        </span>
      </div>

      {/* Error message */}
      {error && (
        <pre
          className="text-[11px] font-mono overflow-auto rounded-lg p-3 max-h-40 scrollbar-thin"
          style={{
            background: 'rgba(0,0,0,0.3)',
            color:      'var(--color-text-secondary)',
            border:     '1px solid var(--color-border-weak)',
            whiteSpace: 'pre-wrap',
            wordBreak:  'break-all',
          }}
        >
          {error.message || 'An unknown error occurred'}
        </pre>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onReset}
          className="btn-ghost flex items-center gap-1.5 text-xs px-3 py-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Try Again
        </button>

        {error && (
          <button
            onClick={copyError}
            className="btn-ghost flex items-center gap-1.5 text-xs px-3 py-1.5"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy Error
          </button>
        )}
      </div>
    </div>
  )
}

// ── Class-based error boundary ────────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: ReactNode
  /** Custom fallback. If omitted, the built-in ErrorCard is used. */
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, info.componentStack)
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    if (this.props.fallback !== undefined) {
      return this.props.fallback
    }

    return (
      <ErrorCard
        error={this.state.error}
        onReset={this.reset}
      />
    )
  }
}

// ── Convenience re-export of the error card for standalone use ────────────────

export { ErrorCard }
