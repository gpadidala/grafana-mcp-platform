import { useState, type ReactNode } from 'react'
import { Copy, Check, ThumbsUp, ThumbsDown, RotateCcw } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AIAvatar } from '@/components/ui/AIAvatar'
import { StreamingText } from './StreamingText'
import { ToolCallCard } from './ToolCallCard'
import { CodeBlock } from './CodeBlock'
import { cn } from '@/lib/utils'
import type { Message } from '@/types/chat'

interface AssistantMessageProps {
  message: Message
  model?: string
}

function MarkdownComponents() {
  return {
    code({ className, children, ...props }: { className?: string; children?: ReactNode; inline?: boolean }) {
      const match = /language-(\w+)/.exec(className ?? '')
      const lang = match ? match[1] : ''
      const isInline = !match && !String(children).includes('\n')

      if (isInline) {
        return (
          <code
            className="px-1.5 py-0.5 rounded text-[0.82em] font-mono"
            style={{
              background: 'rgba(244,104,0,0.12)',
              border: '1px solid rgba(244,104,0,0.2)',
              color: '#fb923c',
            }}
            {...props}
          >
            {children}
          </code>
        )
      }

      return (
        <CodeBlock
          code={String(children).replace(/\n$/, '')}
          language={lang || 'text'}
        />
      )
    },
  }
}

export function AssistantMessage({ message, model }: AssistantMessageProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const hasToolCalls = (message.toolCalls?.length ?? 0) > 0

  return (
    <div className="flex gap-3 group mb-6">
      {/* Avatar */}
      <div className="flex-shrink-0 mt-1">
        <AIAvatar size="sm" breathing={message.isStreaming} />
      </div>

      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-text-primary">GrafanaAI</span>
          {model && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono"
              style={{ background: 'var(--color-ai-muted)', color: 'var(--color-ai)', border: '1px solid rgba(61,157,243,0.2)' }}>
              {model}
            </span>
          )}
        </div>

        {/* Tool calls */}
        {hasToolCalls && (
          <div className="mb-3 space-y-1.5">
            {message.toolCalls?.map((tc) => (
              <ToolCallCard key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}

        {/* Content */}
        {(message.content || message.isStreaming) && (
          <div className="prose-grafana text-sm">
            {message.isStreaming && !message.content ? (
              <div className="flex items-center gap-2 text-text-disabled">
                <span className="typing-dot" style={{ animationDelay: '0ms' }} />
                <span className="typing-dot" style={{ animationDelay: '150ms' }} />
                <span className="typing-dot" style={{ animationDelay: '300ms' }} />
              </div>
            ) : message.isStreaming ? (
              <StreamingText text={message.content} isStreaming={true} />
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={MarkdownComponents()}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        )}

        {/* Actions */}
        {!message.isStreaming && message.content && (
          <div className={cn(
            'flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity',
          )}>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-text-disabled hover:text-text-secondary hover:bg-grafana-elevated transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-status-success" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-text-disabled hover:text-text-secondary hover:bg-grafana-elevated transition-colors">
              <ThumbsUp className="w-3 h-3" />
            </button>
            <button className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-text-disabled hover:text-text-secondary hover:bg-grafana-elevated transition-colors">
              <ThumbsDown className="w-3 h-3" />
            </button>
            <button className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-text-disabled hover:text-text-secondary hover:bg-grafana-elevated transition-colors">
              <RotateCcw className="w-3 h-3" />
              Regenerate
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
