import {
  useRef,
  useState,
  useCallback,
  type ReactNode,
  type UIEvent,
} from 'react'
import { cn } from '@/lib/utils'

export interface VirtualListProps<T> {
  /** Full dataset */
  items: T[]
  /** Fixed pixel height for every row */
  itemHeight: number
  /** Render function for a single item */
  renderItem: (item: T, index: number) => ReactNode
  /** Pixel height of the scrollable container */
  containerHeight: number
  /** Number of extra items to render above/below the visible window (default 5) */
  overscan?: number
  className?: string
}

export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  containerHeight,
  overscan = 5,
  className,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const totalHeight  = items.length * itemHeight
  const visibleCount = Math.ceil(containerHeight / itemHeight)

  // Clamp startIndex so we never go negative
  const rawStart  = Math.floor(scrollTop / itemHeight) - overscan
  const startIndex = Math.max(0, rawStart)

  // Clamp endIndex to the last valid item
  const rawEnd    = startIndex + visibleCount + overscan * 2
  const endIndex  = Math.min(items.length - 1, rawEnd)

  // Translate the rendered window down by the items we skipped
  const paddingTop = startIndex * itemHeight

  const handleScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn('overflow-auto scrollbar-thin', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      {/* Ghost element maintains correct total scroll height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Rendered slice, offset to the correct scroll position */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, transform: `translateY(${paddingTop}px)` }}>
          {items.slice(startIndex, endIndex + 1).map((item, localIdx) => {
            const absoluteIdx = startIndex + localIdx
            return (
              <div key={absoluteIdx} style={{ height: itemHeight, overflow: 'hidden' }}>
                {renderItem(item, absoluteIdx)}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
