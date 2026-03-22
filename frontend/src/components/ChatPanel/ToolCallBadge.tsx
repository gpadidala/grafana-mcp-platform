import { useState } from 'react'
import { ChevronDown, ChevronRight, CheckCircle, XCircle, Loader2, Clock } from 'lucide-react'
import type { ToolCallInfo } from '@/types/chat'
import { clsx } from 'clsx'

interface ToolCallBadgeProps {
  toolCall: ToolCallInfo
}

function getToolIcon(toolName: string): string {
  const name = toolName.toLowerCase()
  if (name.includes('mimir') || name.includes('metric') || name.includes('prometheus')) return '📊'
  if (name.includes('loki') || name.includes('log')) return '📋'
  if (name.includes('tempo') || name.includes('trace')) return '🔍'
  if (name.includes('pyroscope') || name.includes('profile')) return '🔥'
  if (name.includes('faro') || name.includes('rum') || name.includes('web')) return '🌐'
  if (name.includes('alert') || name.includes('grafana')) return '🚨'
  if (name.includes('k8s') || name.includes('kube') || name.includes('pod')) return '☸️'
  if (name.includes('search') || name.includes('find') || name.includes('query')) return '🔎'
  if (name.includes('dashboard')) return '📈'
  return '⚙️'
}

function getToolCategory(toolName: string): { label: string; color: string } {
  const name = toolName.toLowerCase()
  if (name.includes('mimir') || name.includes('metric')) return { label: 'Metrics', color: 'text-purple-400' }
  if (name.includes('loki') || name.includes('log')) return { label: 'Logs', color: 'text-yellow-400' }
  if (name.includes('tempo') || name.includes('trace')) return { label: 'Traces', color: 'text-cyan-400' }
  if (name.includes('pyroscope') || name.includes('profile')) return { label: 'Profiles', color: 'text-orange-400' }
  if (name.includes('faro') || name.includes('rum')) return { label: 'Frontend', color: 'text-pink-400' }
  if (name.includes('alert') || name.includes('grafana')) return { label: 'Grafana', color: 'text-orange-300' }
  if (name.includes('k8s') || name.includes('kube')) return { label: 'K8s', color: 'text-blue-400' }
  return { label: 'Tool', color: 'text-gray-400' }
}

export function ToolCallBadge({ toolCall }: ToolCallBadgeProps) {
  const [expanded, setExpanded] = useState(false)

  const icon = getToolIcon(toolCall.toolName)
  const category = getToolCategory(toolCall.toolName)

  const statusConfig = {
    pending: {
      icon: <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />,
      border: 'border-gray-700/60',
      bg: 'bg-gray-900/60',
      badge: 'bg-gray-800 text-gray-400',
      label: 'Pending',
    },
    running: {
      icon: <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />,
      border: 'border-blue-500/40',
      bg: 'bg-blue-950/20',
      badge: 'bg-blue-900/40 text-blue-300',
      label: 'Running',
    },
    success: {
      icon: <CheckCircle className="w-3.5 h-3.5 text-green-400" />,
      border: 'border-green-500/30',
      bg: 'bg-gray-900/60',
      badge: 'bg-green-900/30 text-green-400',
      label: 'Success',
    },
    error: {
      icon: <XCircle className="w-3.5 h-3.5 text-red-400" />,
      border: 'border-red-500/40',
      bg: 'bg-red-950/20',
      badge: 'bg-red-900/30 text-red-400',
      label: 'Error',
    },
  }[toolCall.status]

  return (
    <div className={clsx(
      'rounded-xl border overflow-hidden my-1 transition-all duration-200',
      statusConfig.border,
      statusConfig.bg,
      toolCall.status === 'running' && 'scan-container',
    )}>
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-white/3 transition-colors"
      >
        {/* Tool icon */}
        <span className="text-base flex-shrink-0">{icon}</span>

        {/* Tool name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-200 truncate">
              {toolCall.toolName}
            </span>
            <span className={clsx('text-[10px] font-medium flex-shrink-0', category.color)}>
              {category.label}
            </span>
          </div>
        </div>

        {/* Status + duration */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {toolCall.durationMs !== undefined && (
            <span className="flex items-center gap-1 text-[10px] text-gray-600">
              <Clock className="w-2.5 h-2.5" />
              {toolCall.durationMs.toFixed(0)}ms
            </span>
          )}
          <span className={clsx('px-1.5 py-0.5 rounded-full text-[10px] font-medium', statusConfig.badge)}>
            {statusConfig.label}
          </span>
          {statusConfig.icon}
          {expanded
            ? <ChevronDown className="w-3.5 h-3.5 text-gray-600" />
            : <ChevronRight className="w-3.5 h-3.5 text-gray-600" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-800/60 px-3 py-2.5 space-y-2.5 animate-fade-in">
          {/* Arguments */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Input</span>
              <div className="flex-1 h-px bg-gray-800/60" />
            </div>
            <pre className="text-xs text-gray-300 bg-black/40 rounded-lg p-2.5 overflow-x-auto
                            border border-gray-800/50 font-mono leading-relaxed">
              {JSON.stringify(toolCall.arguments, null, 2)}
            </pre>
          </div>

          {/* Result */}
          {toolCall.result !== undefined && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Output</span>
                <div className="flex-1 h-px bg-gray-800/60" />
              </div>
              <pre className={clsx(
                'text-xs bg-black/40 rounded-lg p-2.5 overflow-x-auto max-h-48',
                'border font-mono leading-relaxed',
                toolCall.status === 'error' ? 'text-red-300 border-red-900/50' : 'text-gray-300 border-gray-800/50'
              )}>
                {typeof toolCall.result === 'string'
                  ? toolCall.result
                  : JSON.stringify(toolCall.result, null, 2)}
              </pre>
            </div>
          )}

          {/* Error */}
          {toolCall.error && (
            <div className="flex items-start gap-2 text-xs text-red-300 bg-red-950/30
                            border border-red-900/40 rounded-lg p-2.5">
              <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{toolCall.error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
