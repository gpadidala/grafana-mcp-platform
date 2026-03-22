import { type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DataSourceIcon, type DataSourceType } from './DataSourceIcon'

export interface TagProps {
  children: ReactNode
  variant?: 'default' | 'datasource' | 'ai'
  /** Datasource type — only used when variant="datasource" */
  datasource?: DataSourceType
  /** Optional icon on the left */
  icon?: ReactNode
  /** Callback fired when the remove (×) button is clicked */
  onRemove?: () => void
  className?: string
}

export function Tag({
  children,
  variant = 'default',
  datasource,
  icon,
  onRemove,
  className,
}: TagProps) {
  const baseClass = cn(
    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
    'transition-colors duration-150',
    className,
  )

  // ── AI variant ────────────────────────────────────────────
  if (variant === 'ai') {
    return (
      <span
        className={baseClass}
        style={{
          background: 'var(--color-ai-muted)',
          border:     '1px solid rgba(61,157,243,0.3)',
          color:      'var(--color-text-ai)',
        }}
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        {children}
        {onRemove && (
          <button
            onClick={onRemove}
            className="flex-shrink-0 ml-0.5 rounded-full hover:opacity-70 transition-opacity"
            aria-label="Remove"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </span>
    )
  }

  // ── Datasource variant ────────────────────────────────────
  if (variant === 'datasource' && datasource) {
    return (
      <span
        className={baseClass}
        style={{
          background: 'var(--color-bg-overlay)',
          border:     '1px solid var(--color-border-medium)',
          color:      'var(--color-text-secondary)',
        }}
      >
        <DataSourceIcon type={datasource} size={12} />
        {children}
        {onRemove && (
          <button
            onClick={onRemove}
            className="flex-shrink-0 ml-0.5 rounded-full hover:opacity-70 transition-opacity"
            aria-label="Remove"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </span>
    )
  }

  // ── Default variant ───────────────────────────────────────
  return (
    <span
      className={baseClass}
      style={{
        background: 'var(--color-bg-overlay)',
        border:     '1px solid var(--color-border-weak)',
        color:      'var(--color-text-disabled)',
      }}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
      {onRemove && (
        <button
          onClick={onRemove}
          className="flex-shrink-0 ml-0.5 rounded-full hover:opacity-70 transition-opacity"
          aria-label="Remove"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  )
}
