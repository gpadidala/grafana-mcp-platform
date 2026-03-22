import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, Bell, Search, ChevronDown } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { useLLMStore } from '@/store/llmStore'
import { PROVIDER_MODELS, PROVIDER_DISPLAY_NAMES } from '@/types/llm'
import { cn } from '@/lib/utils'
import { useLocation } from 'react-router-dom'

const ROUTE_LABELS: Record<string, string> = {
  '/chat': 'Chat',
  '/investigate': 'Investigate',
  '/dashboards': 'Dashboards',
  '/query': 'Query Builder',
  '/skills': 'Skills',
  '/settings': 'Settings',
}

function ModelSelector() {
  const { config, setModel, setProvider } = useLLMStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 px-3 h-8 rounded-lg text-12 font-medium transition-all duration-150',
          'border text-on-muted',
          open
            ? 'bg-blue-500/10 border-blue-500/40'
            : 'bg-elevated border-blue-500/15 hover:border-blue-500/30',
        )}
      >
        <span className="font-mono text-11 text-accent-blue truncate max-w-[88px]">
          {config.model}
        </span>
        <ChevronDown className={cn('w-3 h-3 transition-transform duration-150 text-on-subtle', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.1 }}
            className="absolute right-0 top-full mt-1.5 z-50 w-64 rounded-xl overflow-hidden"
            style={{
              background: '#0D1321',
              border: '1px solid rgba(59,130,246,0.2)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            }}
          >
            {Object.entries(PROVIDER_MODELS).map(([provider, models]) => (
              <div
                key={provider}
                className="border-b last:border-0"
                style={{ borderColor: 'rgba(59,130,246,0.08)' }}
              >
                <div className="px-3 py-2 text-10 font-semibold uppercase tracking-widest text-on-subtle">
                  {PROVIDER_DISPLAY_NAMES[provider as keyof typeof PROVIDER_DISPLAY_NAMES]}
                </div>
                {models.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setProvider(provider as typeof config.provider)
                      setModel(m.id)
                      setOpen(false)
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2 text-13 font-medium transition-colors duration-100',
                      'hover:bg-blue-500/8',
                      config.model === m.id ? 'text-accent-blue' : 'text-on-muted',
                    )}
                  >
                    {m.displayName}
                  </button>
                ))}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function TopNav() {
  const { toggleSidebarCollapsed, setCommandPaletteOpen } = useUIStore()
  const location = useLocation()
  const currentLabel = ROUTE_LABELS[location.pathname] ?? 'NovaSRE'

  return (
    <header
      className="h-[52px] min-h-[52px] flex items-center gap-3 px-5 flex-shrink-0 relative z-20"
      style={{
        background: 'rgba(5,10,20,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(59,130,246,0.1)',
      }}
    >
      {/* Bottom gradient line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(to right, transparent 0%, rgba(59,130,246,0.3) 30%, rgba(6,182,212,0.25) 60%, rgba(59,130,246,0.3) 80%, transparent 100%)' }}
      />

      {/* Hamburger */}
      <button
        onClick={toggleSidebarCollapsed}
        className="p-1.5 rounded-md text-on-subtle hover:bg-blue-500/8 hover:text-on-primary transition-colors duration-150 flex-shrink-0"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Breadcrumb */}
      <div className="text-13 text-on-subtle flex-shrink-0 hidden sm:flex items-center gap-1.5">
        <span className="text-on-subtle">NovaSRE</span>
        <span className="text-on-subtle opacity-40">/</span>
        <span className="text-on-primary font-medium">{currentLabel}</span>
      </div>

      {/* Search */}
      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="flex items-center gap-2 px-3 h-8 rounded-lg border border-blue-500/15 hover:border-blue-500/35 text-12 text-on-subtle hover:text-on-muted transition-all duration-150 flex-1 max-w-[380px] mx-auto"
        style={{ background: '#111827' }}
        onFocus={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)' }}
        onBlur={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '' }}
      >
        <Search className="w-3.5 h-3.5 flex-shrink-0 text-on-subtle" />
        <span className="flex-1 text-left italic text-on-subtle">Search dashboards, ask anything...</span>
        <kbd
          className="flex-shrink-0 text-10 px-1.5 py-0.5 rounded border border-blue-500/15 text-on-subtle hidden sm:block not-italic"
          style={{ background: 'rgba(59,130,246,0.06)' }}
        >
          ⌘K
        </kbd>
      </button>

      <div className="flex-1" />

      {/* Right items */}
      <div className="flex items-center gap-2">
        {/* AI status */}
        <div
          className="hidden sm:flex items-center gap-1.5 px-2.5 h-8 rounded-lg border border-emerald-500/20 text-12"
          style={{ background: 'rgba(16,185,129,0.06)' }}
        >
          <div className="relative w-1.5 h-1.5 flex-shrink-0">
            <div className="absolute inset-0 rounded-full bg-status-success" />
            <div className="absolute inset-0 rounded-full bg-status-success animate-ping opacity-60" />
          </div>
          <span className="font-semibold text-status-success">AI Online</span>
        </div>

        <ModelSelector />

        {/* Bell */}
        <button className="relative p-1.5 rounded-md text-on-subtle hover:bg-blue-500/8 hover:text-on-primary transition-colors duration-150">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500" />
        </button>

        {/* Avatar */}
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-11 font-bold text-white flex-shrink-0 select-none"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #0EA5E9)', boxShadow: '0 0 10px rgba(59,130,246,0.35)' }}
        >
          G
        </div>
      </div>
    </header>
  )
}
