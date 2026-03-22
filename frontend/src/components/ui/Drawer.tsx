import { type ReactNode, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /** Width in pixels (default 400) */
  width?: number
  /** Optional sticky footer content */
  footer?: ReactNode
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  width = 400,
  footer,
}: DrawerProps) {
  const firstFocusRef = useRef<HTMLButtonElement>(null)

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      // Focus the close button for keyboard users
      firstFocusRef.current?.focus()
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className={cn(
          'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm',
          'transition-opacity duration-200',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'fixed top-0 right-0 bottom-0 z-50',
          'flex flex-col',
          'transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        style={{
          width,
          background: 'var(--color-bg-secondary)',
          borderLeft: '1px solid var(--color-border-medium)',
          boxShadow:  'var(--shadow-elevated)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--color-border-weak)' }}
        >
          <h2 className="text-base font-semibold text-text-primary truncate pr-4">
            {title ?? ''}
          </h2>
          <button
            ref={firstFocusRef}
            onClick={onClose}
            className={cn(
              'flex-shrink-0 p-1.5 rounded-md',
              'text-text-disabled hover:text-text-secondary',
              'hover:bg-grafana-elevated transition-colors',
            )}
            aria-label="Close drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
          {children}
        </div>

        {/* Optional sticky footer */}
        {footer && (
          <div
            className="flex-shrink-0 px-5 py-4"
            style={{ borderTop: '1px solid var(--color-border-weak)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </>
  )
}
