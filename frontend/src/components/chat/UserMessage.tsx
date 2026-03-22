import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Message } from '@/types/chat'

interface UserMessageProps {
  message: Message
}

export function UserMessage({ message }: UserMessageProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const ts = message.timestamp instanceof Date
    ? message.timestamp
    : new Date(message.timestamp)

  return (
    <div className="flex justify-end group mb-4">
      <div className="max-w-[80%] relative">
        <div
          className="px-4 py-3 rounded-2xl rounded-br-sm text-sm leading-relaxed"
          style={{
            background: 'linear-gradient(135deg, rgba(244,104,0,0.3) 0%, rgba(244,104,0,0.18) 100%)',
            border: '1px solid rgba(244,104,0,0.25)',
            color: 'var(--color-text-primary)',
          }}
        >
          {message.content}
        </div>
        <div className={cn(
          'flex items-center gap-2 mt-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity',
        )}>
          <span className="text-[10px] text-text-disabled">
            {ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button
            onClick={handleCopy}
            className="p-1 rounded text-text-disabled hover:text-text-secondary transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-status-success" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      </div>
    </div>
  )
}
