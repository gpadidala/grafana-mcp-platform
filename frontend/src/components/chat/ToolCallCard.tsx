import { useState } from 'react'
import { ChevronDown, ChevronUp, Check, X, Loader, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ToolCallInfo } from '@/types/chat'

interface ToolCallCardProps {
  toolCall: ToolCallInfo
}

export function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const [resultOpen, setResultOpen] = useState(false)

  const isRunning = toolCall.status === 'running'
  const isSuccess = toolCall.status === 'success'
  const isError = toolCall.status === 'error'

  return (
    <div
      className={cn(
        'rounded-lg overflow-hidden my-1.5 transition-all duration-200',
        isRunning && 'tool-call-shimmer',
        isError && 'border-status-error/30'
      )}
      style={{
        border: `1px solid ${isError ? 'rgba(242,73,92,0.3)' : isRunning ? 'rgba(61,157,243,0.25)' : 'var(--color-border-weak)'}`,
        background: isError ? 'rgba(242,73,92,0.05)' : 'var(--color-bg-elevated)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="flex items-center justify-center w-6 h-6 rounded-md flex-shrink-0"
          style={{ background: 'rgba(61,157,243,0.12)' }}>
          <Wrench className="w-3.5 h-3.5 text-ai" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-medium text-ai">
              {toolCall.toolName}
            </span>
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
              isRunning && 'text-status-warning bg-[rgba(249,203,68,0.12)]',
              isSuccess && 'text-status-success bg-[rgba(115,191,105,0.12)]',
              isError && 'text-status-error bg-[rgba(242,73,92,0.12)]',
            )}>
              {isRunning ? 'running...' : isSuccess ? `done${toolCall.durationMs ? ` · ${toolCall.durationMs}ms` : ''}` : 'error'}
            </span>
          </div>

          {/* Compact args preview */}
          {Object.keys(toolCall.arguments).length > 0 && (
            <div className="mt-0.5 text-[11px] text-text-disabled font-mono truncate">
              {Object.entries(toolCall.arguments)
                .slice(0, 2)
                .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
                .join(', ')}
            </div>
          )}
        </div>

        {/* Status icon */}
        <div className="flex-shrink-0">
          {isRunning && <Loader className="w-4 h-4 text-ai animate-spin" />}
          {isSuccess && <Check className="w-4 h-4 text-status-success" />}
          {isError && <X className="w-4 h-4 text-status-error" />}
        </div>

        {/* Toggle result */}
        {(isSuccess || isError) && toolCall.result !== undefined && (
          <button
            onClick={() => setResultOpen((v) => !v)}
            className="flex-shrink-0 p-1 rounded text-text-disabled hover:text-text-secondary transition-colors"
          >
            {resultOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Error message */}
      {isError && toolCall.error && (
        <div className="px-3 pb-2.5">
          <p className="text-xs text-status-error">{toolCall.error}</p>
        </div>
      )}

      {/* Result */}
      {resultOpen && toolCall.result !== undefined && (
        <div
          className="px-3 pb-3"
          style={{ borderTop: '1px solid var(--color-border-weak)' }}
        >
          <pre
            className="mt-2.5 text-[11px] font-mono text-text-secondary overflow-x-auto rounded-md p-2.5"
            style={{ background: 'var(--color-bg-canvas)', maxHeight: '200px' }}
          >
            {typeof toolCall.result === 'string'
              ? toolCall.result
              : JSON.stringify(toolCall.result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
