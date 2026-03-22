import { useState, useRef, useEffect, type KeyboardEvent, type FormEvent } from 'react'
import { Send, Loader, Wrench, Zap, History } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSend: (content: string) => void
  isStreaming: boolean
  disabled?: boolean
  toolCount?: number
}

type ActiveTab = 'skills' | 'tools' | 'history'

export function ChatInput({ onSend, isStreaming, disabled, toolCount = 0 }: ChatInputProps) {
  const [value, setValue] = useState('')
  const [activeTab, setActiveTab] = useState<ActiveTab>('skills')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    const maxH = 6 * 24 + 32
    ta.style.height = Math.min(ta.scrollHeight, maxH) + 'px'
  }, [value])

  const canSend = value.trim().length > 0 && !isStreaming && !disabled

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault()
    if (!canSend) return
    const content = value.trim()
    setValue('')
    onSend(content)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
  }

  const TABS: { id: ActiveTab; label: string; icon: typeof Zap }[] = [
    { id: 'skills', label: 'Skills', icon: Zap },
    { id: 'tools', label: `Tools${toolCount > 0 ? ` (${toolCount})` : ''}`, icon: Wrench },
    { id: 'history', label: 'History', icon: History },
  ]

  return (
    <div className="flex-shrink-0 px-4 pb-4 pt-2">
      <div className="max-w-3xl mx-auto space-y-2">
        {/* Input box */}
        <form
          onSubmit={handleSubmit}
          className="relative rounded-xl overflow-hidden border border-blue-500/20 transition-all duration-150"
          style={{ background: '#111827', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}
        >
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your infrastructure..."
            disabled={isStreaming || disabled}
            rows={1}
            className="w-full bg-transparent resize-none px-4 pt-3.5 pb-3.5 pr-14 text-13 text-on-primary outline-none placeholder:text-on-subtle disabled:opacity-50"
            style={{ minHeight: '52px', maxHeight: '200px' }}
            onFocus={(e) => {
              const form = e.currentTarget.closest('form') as HTMLElement
              if (form) form.style.borderColor = 'rgba(59,130,246,0.5)'
              if (form) form.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12), 0 4px 20px rgba(0,0,0,0.4)'
            }}
            onBlur={(e) => {
              const form = e.currentTarget.closest('form') as HTMLElement
              if (form) form.style.borderColor = 'rgba(59,130,246,0.2)'
              if (form) form.style.boxShadow = '0 4px 20px rgba(0,0,0,0.4)'
            }}
          />

          {/* Send button — circle, absolute right */}
          <button
            type="submit"
            disabled={!canSend}
            className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center',
              'transition-all duration-150 flex-shrink-0',
              canSend
                ? 'bg-accent-blue hover:brightness-110 shadow-glow'
                : 'bg-blue-500/8 border border-blue-500/15 cursor-not-allowed',
            )}
          >
            {isStreaming
              ? <Loader className="w-3.5 h-3.5 animate-spin text-on-primary" />
              : <Send className={cn('w-3.5 h-3.5', canSend ? 'text-white' : 'text-on-subtle')} />
            }
          </button>
        </form>

        {/* Helper row */}
        <div className="flex items-center justify-between px-1">
          {/* Pill tabs */}
          <div className="flex items-center gap-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  'flex items-center gap-1 px-2.5 h-6 rounded-full text-11 font-medium border transition-all duration-150',
                  activeTab === id
                    ? 'bg-blue-500/15 border-blue-500/40 text-on-primary'
                    : 'bg-transparent border-transparent text-on-muted hover:text-on-primary hover:border-blue-500/20',
                )}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>

          {/* Helper text */}
          <span className="text-11 text-on-subtle hidden sm:block">
            ↵ Send · ⇧↵ New line
          </span>
        </div>
      </div>
    </div>
  )
}
