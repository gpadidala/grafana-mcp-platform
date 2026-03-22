import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { useLLMStore } from '@/store/llmStore'
import { PROVIDER_DISPLAY_NAMES, type LLMProviderType } from '@/types/llm'
import { cn } from '@/lib/utils'

interface ModelSelectorProps {
  compact?: boolean
}

const PROVIDER_MODELS: Record<LLMProviderType, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  anthropic: ['claude-opus-4-6', 'claude-sonnet-4-6'],
  gemini: ['gemini-1.5-pro', 'gemini-1.5-flash'],
  ollama: ['llama3.2', 'mistral', 'codellama', 'llama3.1'],
  azure: ['gpt-4o', 'gpt-4-turbo'],
  openai_compatible: ['custom'],
}

const PROVIDER_COLORS: Record<LLMProviderType, string> = {
  openai: '#73bf69',
  anthropic: '#fb923c',
  azure: '#5794f2',
  gemini: '#9d6fd4',
  ollama: '#9fa7b3',
  openai_compatible: '#22D3EE',
}

export function ModelSelector({ compact = false }: ModelSelectorProps) {
  const { config, setProvider, setModel } = useLLMStore()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const providers = Object.keys(PROVIDER_DISPLAY_NAMES) as LLMProviderType[]

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-2 rounded-lg font-medium transition-all duration-150',
          compact ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-xs',
          open ? 'bg-grafana-elevated' : 'hover:bg-grafana-elevated'
        )}
        style={{ border: '1px solid var(--color-border-weak)', color: 'var(--color-text-secondary)' }}
      >
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: PROVIDER_COLORS[config.provider] }}
        />
        <span style={{ color: 'var(--color-text-primary)' }}>
          {PROVIDER_DISPLAY_NAMES[config.provider]} / {config.model}
        </span>
        <ChevronDown
          className={cn('flex-shrink-0 transition-transform', open && 'rotate-180', compact ? 'w-3 h-3' : 'w-3 h-3')}
          style={{ color: 'var(--color-text-disabled)' }}
        />
      </button>

      {open && (
        <div
          className="absolute bottom-full mb-2 left-0 min-w-64 rounded-xl overflow-hidden z-50"
          style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border-medium)',
            boxShadow: 'var(--shadow-elevated)',
          }}
        >
          {/* Provider section */}
          <div
            className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider"
            style={{
              color: 'var(--color-text-disabled)',
              borderBottom: '1px solid var(--color-border-weak)',
            }}
          >
            Provider
          </div>
          <div className="py-1">
            {providers.map((prov) => (
              <button
                key={prov}
                onClick={() => {
                  setProvider(prov)
                  setModel(PROVIDER_MODELS[prov][0])
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors hover:bg-grafana-overlay"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: PROVIDER_COLORS[prov] }}
                />
                <span style={{ color: 'var(--color-text-primary)' }}>
                  {PROVIDER_DISPLAY_NAMES[prov]}
                </span>
                {config.provider === prov && (
                  <Check className="w-3.5 h-3.5 ml-auto" style={{ color: 'var(--color-ai)' }} />
                )}
              </button>
            ))}
          </div>

          {/* Model section */}
          <div
            className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider"
            style={{
              color: 'var(--color-text-disabled)',
              borderTop: '1px solid var(--color-border-weak)',
              borderBottom: '1px solid var(--color-border-weak)',
            }}
          >
            Model
          </div>
          <div className="py-1">
            {PROVIDER_MODELS[config.provider].map((m) => (
              <button
                key={m}
                onClick={() => {
                  setModel(m)
                  setOpen(false)
                }}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-1.5 text-xs font-mono transition-colors',
                  config.model === m ? 'bg-ai-muted' : 'hover:bg-grafana-elevated'
                )}
                style={{
                  color: config.model === m ? 'var(--color-ai)' : 'var(--color-text-disabled)',
                }}
              >
                <span>{m}</span>
                {config.model === m && <Check className="w-3 h-3" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
