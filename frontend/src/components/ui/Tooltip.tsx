import {
  useState,
  useRef,
  useEffect,
  type ReactNode,
  type CSSProperties,
} from 'react'
import { cn } from '@/lib/utils'

export interface TooltipProps {
  children: ReactNode
  content: ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
  className?: string
}

interface Position {
  top: number
  left: number
  arrowStyle: CSSProperties
}

function getPosition(
  triggerRect: DOMRect,
  tooltipEl: HTMLDivElement | null,
  side: TooltipProps['side'],
): Position {
  const GAP = 8

  const tooltipW = tooltipEl?.offsetWidth  ?? 0
  const tooltipH = tooltipEl?.offsetHeight ?? 0

  let top  = 0
  let left = 0
  let arrowStyle: CSSProperties = {}

  switch (side) {
    case 'top':
      top  = triggerRect.top  - tooltipH - GAP + window.scrollY
      left = triggerRect.left + triggerRect.width / 2 - tooltipW / 2 + window.scrollX
      arrowStyle = {
        bottom: -5,
        left: '50%',
        transform: 'translateX(-50%) rotate(45deg)',
      }
      break
    case 'bottom':
      top  = triggerRect.bottom + GAP + window.scrollY
      left = triggerRect.left + triggerRect.width / 2 - tooltipW / 2 + window.scrollX
      arrowStyle = {
        top: -5,
        left: '50%',
        transform: 'translateX(-50%) rotate(45deg)',
      }
      break
    case 'left':
      top  = triggerRect.top  + triggerRect.height / 2 - tooltipH / 2 + window.scrollY
      left = triggerRect.left - tooltipW - GAP + window.scrollX
      arrowStyle = {
        right: -5,
        top: '50%',
        transform: 'translateY(-50%) rotate(45deg)',
      }
      break
    case 'right':
      top  = triggerRect.top  + triggerRect.height / 2 - tooltipH / 2 + window.scrollY
      left = triggerRect.right + GAP + window.scrollX
      arrowStyle = {
        left: -5,
        top: '50%',
        transform: 'translateY(-50%) rotate(45deg)',
      }
      break
  }

  return { top, left, arrowStyle }
}

export function Tooltip({
  children,
  content,
  side = 'top',
  delay = 600,
  className,
}: TooltipProps) {
  const [visible, setVisible]         = useState(false)
  const [position, setPosition]       = useState<Position | null>(null)
  const triggerRef  = useRef<HTMLDivElement>(null)
  const tooltipRef  = useRef<HTMLDivElement>(null)
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Recalculate position whenever visible and tooltip element are ready
  useEffect(() => {
    if (!visible || !triggerRef.current) return

    const update = () => {
      if (!triggerRef.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      setPosition(getPosition(rect, tooltipRef.current, side))
    }

    // Run immediately, then again on next tick once tooltipRef is populated
    update()
    const id = requestAnimationFrame(update)
    return () => cancelAnimationFrame(id)
  }, [visible, side])

  const show = () => {
    timerRef.current = setTimeout(() => setVisible(true), delay)
  }

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setVisible(false)
    setPosition(null)
  }

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}

      {visible && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={cn(
            'fixed z-[9999] max-w-xs text-sm pointer-events-none',
            'rounded-lg px-3 py-2',
            // entrance animation
            'animate-[fade-in_150ms_ease-out]',
            className,
          )}
          style={{
            top:         position?.top  ?? -9999,
            left:        position?.left ?? -9999,
            background:  'var(--color-bg-elevated)',
            border:      '1px solid var(--color-border-medium)',
            color:       'var(--color-text-primary)',
            boxShadow:   'var(--shadow-elevated)',
            // hide until position is calculated to avoid flicker
            visibility:  position ? 'visible' : 'hidden',
          }}
        >
          {/* Arrow */}
          <span
            className="absolute w-2.5 h-2.5"
            style={{
              ...(position?.arrowStyle ?? {}),
              background: 'var(--color-bg-elevated)',
              border:     '1px solid var(--color-border-medium)',
              // only show the two outer edges that form the arrow corner
              clipPath:   'polygon(0 0, 100% 0, 100% 100%)',
            }}
          />
          <span className="relative z-10">{content}</span>
        </div>
      )}
    </div>
  )
}
