import { useState, useEffect, useRef } from 'react'
import { Search, MessageSquare, LayoutDashboard, Wrench, X, ArrowRight } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: typeof Search
  action: () => void
  group: string
}

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const close = () => {
    setCommandPaletteOpen(false)
    setQuery('')
    setSelected(0)
  }

  const BASE_ITEMS: CommandItem[] = [
    { id: 'chat', label: 'Go to Chat', description: 'Open AI chat', icon: MessageSquare, action: () => { navigate('/chat'); close() }, group: 'Navigation' },
    { id: 'investigate', label: 'Investigate', description: 'Run parallel investigation', icon: Search, action: () => { navigate('/investigate'); close() }, group: 'Navigation' },
    { id: 'dashboards', label: 'Dashboards', description: 'Browse Grafana dashboards', icon: LayoutDashboard, action: () => { navigate('/dashboards'); close() }, group: 'Navigation' },
    { id: 'query', label: 'Query Builder', description: 'Build PromQL/LogQL queries', icon: Wrench, action: () => { navigate('/query'); close() }, group: 'Navigation' },
    { id: 'skills', label: 'Skills', description: 'Manage investigation skills', icon: Wrench, action: () => { navigate('/skills'); close() }, group: 'Navigation' },
    { id: 'settings', label: 'Settings', description: 'Configure integrations', icon: Wrench, action: () => { navigate('/settings'); close() }, group: 'Navigation' },
  ]

  const filtered = query.trim()
    ? BASE_ITEMS.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.description?.toLowerCase().includes(query.toLowerCase())
      )
    : BASE_ITEMS

  // Focus input when opened
  useEffect(() => {
    if (commandPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [commandPaletteOpen])

  // Keyboard navigation
  useEffect(() => {
    if (!commandPaletteOpen) return

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { close(); return }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelected((v) => Math.min(v + 1, filtered.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelected((v) => Math.max(v - 1, 0))
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        filtered[selected]?.action()
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [commandPaletteOpen, selected, filtered])

  // Global ⌘K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [setCommandPaletteOpen])

  if (!commandPaletteOpen) return null

  // Group items
  const groups = [...new Set(filtered.map((i) => i.group))]

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-start justify-center pt-20 px-4"
      onClick={close}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-lg rounded-xl overflow-hidden shadow-elevated animate-slide-up"
        style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-medium)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: '1px solid var(--color-border-weak)' }}
        >
          <Search className="w-4 h-4 flex-shrink-0 text-text-disabled" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(0) }}
            placeholder="Search dashboards, ask anything..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-disabled outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-text-disabled hover:text-text-secondary transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-border-medium text-text-disabled"
            style={{ background: 'var(--color-bg-primary)' }}>
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto scrollbar-thin py-2">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-text-disabled">
              No results for "{query}"
            </div>
          ) : (
            groups.map((group) => (
              <div key={group}>
                <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-disabled">
                  {group}
                </div>
                {filtered
                  .filter((i) => i.group === group)
                  .map((item) => {
                    const globalIdx = filtered.indexOf(item)
                    const Icon = item.icon
                    return (
                      <button
                        key={item.id}
                        onClick={item.action}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                          globalIdx === selected
                            ? 'bg-grafana-overlay text-text-primary'
                            : 'text-text-secondary hover:bg-grafana-overlay hover:text-text-primary'
                        )}
                        onMouseEnter={() => setSelected(globalIdx)}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0 text-text-disabled" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">{item.label}</span>
                          {item.description && (
                            <span className="text-xs text-text-disabled ml-2">{item.description}</span>
                          )}
                        </div>
                        {globalIdx === selected && (
                          <ArrowRight className="w-3.5 h-3.5 text-text-disabled flex-shrink-0" />
                        )}
                      </button>
                    )
                  })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div
          className="flex items-center gap-3 px-4 py-2 text-[11px] text-text-disabled"
          style={{ borderTop: '1px solid var(--color-border-weak)' }}
        >
          <span><kbd className="px-1 py-0.5 rounded border border-border-weak text-[10px]">↑↓</kbd> navigate</span>
          <span><kbd className="px-1 py-0.5 rounded border border-border-weak text-[10px]">↵</kbd> select</span>
          <span><kbd className="px-1 py-0.5 rounded border border-border-weak text-[10px]">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  )
}
