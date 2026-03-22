import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: ReactNode
  heading: string
  subtext?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, heading, subtext, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 py-16 px-8 text-center', className)}>
      {icon && (
        <div className="text-text-disabled mb-2">
          {icon}
        </div>
      )}
      <h3 className="text-text-primary font-semibold text-base">{heading}</h3>
      {subtext && <p className="text-text-secondary text-sm max-w-xs">{subtext}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
