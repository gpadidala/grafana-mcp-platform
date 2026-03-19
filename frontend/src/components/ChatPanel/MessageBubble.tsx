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
    <div className={clsx('flex gap-3 group', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div className={clsx(
        'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1',
        isUser ? 'bg-blue-600' : 'bg-orange-600'
      )}>
        {isUser ? 'U' : 'G'}
      </div>

      {/* Content */}
      <div className={clsx('max-w-[80%] space-y-1', isUser ? 'items-end flex flex-col' : '')}>
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
            'relative px-4 py-3 rounded-2xl text-sm leading-relaxed',
            isUser
              ? 'bg-blue-600 text-white rounded-tr-sm'
              : 'bg-gray-800 text-gray-100 rounded-tl-sm'
          )}>
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    code({ node, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '')
                      const isInline = !className
                      return isInline ? (
                        <code className="bg-gray-700 px-1 py-0.5 rounded text-orange-300 text-xs" {...props}>
                          {children}
                        </code>
                      ) : (
                        <div className="relative group/code">
                          <code className={className} {...props}>{children}</code>
                        </div>
                      )
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>
                {message.isStreaming && (
                  <span className="inline-block w-1.5 h-4 bg-gray-400 animate-pulse ml-0.5 align-middle" />
                )}
              </div>
            )}

            {/* Copy button */}
            {!isUser && message.content && !message.isStreaming && (
              <button
                onClick={copyToClipboard}
                className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100
                           text-gray-500 hover:text-gray-300 transition-opacity"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-xs text-gray-600 px-1">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}
