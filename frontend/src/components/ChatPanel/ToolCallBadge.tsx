import { useState } from 'react'
import { ChevronDown, ChevronRight, Wrench, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import type { ToolCallInfo } from '@/types/chat'
import { clsx } from 'clsx'

interface ToolCallBadgeProps {
  toolCall: ToolCallInfo
}

export function ToolCallBadge({ toolCall }: ToolCallBadgeProps) {
  const [expanded, setExpanded] = useState(false)

  const statusIcon = {
    pending: <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />,
    running: <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />,
    success: <CheckCircle className="w-3.5 h-3.5 text-green-400" />,
    error: <XCircle className="w-3.5 h-3.5 text-red-400" />,
  }[toolCall.status]

  const statusBorder = {
    pending: 'border-gray-600',
    running: 'border-blue-600',
    success: 'border-green-800',
    error: 'border-red-800',
  }[toolCall.status]

  return (
    <div className={clsx(
      'rounded-lg border bg-gray-900/80 overflow-hidden my-1',
      statusBorder
    )}>
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-800/50"
      >
        <Wrench className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
        <span className="text-xs font-mono text-purple-300 flex-1">{toolCall.toolName}</span>
        {statusIcon}
        {expanded
          ? <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
          : <ChevronRight className="w-3.5 h-3.5 text-gray-500" />}
      </button>

      {expanded && (
        <div className="border-t border-gray-800 px-3 py-2 space-y-2">
          {/* Arguments */}
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Input</span>
            <pre className="mt-1 text-xs text-gray-300 bg-gray-950 rounded p-2 overflow-x-auto">
              {JSON.stringify(toolCall.arguments, null, 2)}
            </pre>
          </div>

          {/* Result */}
          {toolCall.result !== undefined && (
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Output</span>
              <pre className="mt-1 text-xs text-gray-300 bg-gray-950 rounded p-2 overflow-x-auto max-h-48">
                {typeof toolCall.result === 'string'
                  ? toolCall.result
                  : JSON.stringify(toolCall.result, null, 2)}
              </pre>
            </div>
          )}

          {toolCall.error && (
            <div className="text-xs text-red-400 bg-red-950/30 rounded p-2">
              {toolCall.error}
            </div>
          )}

          {toolCall.durationMs !== undefined && (
            <span className="text-xs text-gray-600">
              {toolCall.durationMs.toFixed(0)}ms
            </span>
          )}
        </div>
      )}
    </div>
  )
}
