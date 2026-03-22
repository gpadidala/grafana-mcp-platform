import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { ToolCallBadge } from './ToolCallBadge'
import type { Message } from '@/types/chat'
import { clsx } from 'clsx'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={clsx(
      'flex gap-3 group animate-slide-in-up',
      isUser ? 'flex-row-reverse' : 'flex-row'
    )}>
      {/* Avatar */}
      <div className="flex-shrink-0 mt-1">
        {isUser ? (
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold
                          bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-glow-blue">
            U
          </div>
        ) : (
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm
                          bg-gradient-to-br from-orange-500 to-amber-600 shadow-glow-orange">
            🤖
          </div>
        )}
      </div>

      {/* Content */}
      <div className={clsx('max-w-[82%] space-y-1.5', isUser ? 'items-end flex flex-col' : '')}>
        {/* Tool calls (before text) */}
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <div className="w-full space-y-1">
            {message.toolCalls.map(tc => (
              <ToolCallBadge key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}

        {/* Message text */}
        {(message.content || message.isStreaming) && (
          <div className={clsx(
            'relative text-sm leading-relaxed',
            isUser
              ? 'px-4 py-3 rounded-2xl rounded-tr-sm text-white'
              : 'px-4 py-3 rounded-2xl rounded-tl-sm'
          )}
          style={isUser ? {
            background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
            boxShadow: '0 2px 12px rgba(79, 70, 229, 0.25)',
          } : {
            background: 'rgba(17, 24, 39, 0.8)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(55, 65, 81, 0.5)',
            borderLeft: '2px solid rgba(251, 146, 60, 0.5)',
          }}>

            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    code({ className, children, ...props }) {
                      const isInline = !className
                      return isInline ? (
                        <code className="bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5
                                         rounded text-orange-300 text-xs font-mono" {...props}>
                          {children}
                        </code>
                      ) : (
                        <div className="relative group/code">
                          <code className={clsx(className, 'text-xs')} {...props}>{children}</code>
                        </div>
                      )
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>

                {/* Streaming indicator */}
                {message.isStreaming && (
                  <span className="inline-flex gap-0.5 ml-1 align-middle">
                    <span className="typing-dot bg-orange-400 opacity-70" />
                    <span className="typing-dot bg-orange-400 opacity-70" />
                    <span className="typing-dot bg-orange-400 opacity-70" />
                  </span>
                )}
              </div>
            )}

            {/* Copy button */}
            {!isUser && message.content && !message.isStreaming && (
              <button
                onClick={copyToClipboard}
                className="absolute top-2 right-2 p-1.5 rounded-lg
                           opacity-0 group-hover:opacity-100
                           text-gray-600 hover:text-gray-300
                           hover:bg-gray-700/60
                           transition-all duration-150"
                title="Copy message"
              >
                {copied
                  ? <Check className="w-3.5 h-3.5 text-green-400" />
                  : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-[11px] text-gray-700 px-1">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}
