import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'ai' | 'tool' | 'default'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'badge-success',
  warning: 'badge-warning',
  error: 'badge-error',
  info: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[rgba(87,148,242,0.15)] text-status-info border border-[rgba(87,148,242,0.25)]',
  ai: 'badge-ai',
  tool: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[rgba(157,111,212,0.15)] text-neural border border-[rgba(157,111,212,0.25)]',
  default: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-grafana-elevated text-text-secondary border border-border-medium',
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span className={cn(variantClasses[variant], className)} {...props}>
      {children}
    </span>
  )
}
