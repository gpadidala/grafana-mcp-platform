import { cn } from '@/lib/utils'

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical'
  /** Optional centered label (horizontal only) */
  label?: string
  className?: string
}

export function Divider({
  orientation = 'horizontal',
  label,
  className,
}: DividerProps) {
  // ── Vertical ──────────────────────────────────────────────
  if (orientation === 'vertical') {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        className={cn('inline-block w-px self-stretch', className)}
        style={{ background: 'var(--color-border-weak)' }}
      />
    )
  }

  // ── Horizontal with label ─────────────────────────────────
  if (label) {
    return (
      <div
        role="separator"
        aria-orientation="horizontal"
        className={cn('flex items-center gap-3', className)}
      >
        <div className="flex-1 h-px" style={{ background: 'var(--color-border-weak)' }} />
        <span className="text-[11px] font-medium" style={{ color: 'var(--color-text-disabled)' }}>
          {label}
        </span>
        <div className="flex-1 h-px" style={{ background: 'var(--color-border-weak)' }} />
      </div>
    )
  }

  // ── Horizontal plain ──────────────────────────────────────
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      className={cn('h-px w-full', className)}
      style={{ background: 'var(--color-border-weak)' }}
    />
  )
}
