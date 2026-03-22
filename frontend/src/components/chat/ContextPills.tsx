import { X, LayoutDashboard, Database, Bell } from 'lucide-react'

interface ContextItem {
  id: string
  title: string
  type: 'dashboard' | 'datasource' | 'alert'
}

interface ContextPillsProps {
  items: ContextItem[]
  onRemove: (id: string) => void
}

const TYPE_ICONS = {
  dashboard: LayoutDashboard,
  datasource: Database,
  alert: Bell,
} as const

export function ContextPills({ items, onRemove }: ContextPillsProps) {
  if (items.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 px-4 py-2" style={{ borderBottom: '1px solid var(--color-border-weak)' }}>
      {items.map((item, index) => {
        const Icon = TYPE_ICONS[item.type] ?? LayoutDashboard
        return (
          <div
            key={item.id}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{
              background: 'var(--color-ai-muted)',
              border: '1px solid rgba(61,157,243,0.2)',
              color: 'var(--color-ai)',
              animation: `slideUp 200ms ease-out ${index * 30}ms both`,
            }}
          >
            <Icon className="w-3 h-3 flex-shrink-0" />
            <span className="max-w-[128px] truncate">{item.title}</span>
            <button
              onClick={() => onRemove(item.id)}
              className="ml-0.5 transition-colors hover:opacity-80"
              style={{ color: 'var(--color-text-disabled)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-status-error, #ef4444)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-text-disabled)'
              }}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
