import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type CardVariant = 'default' | 'elevated' | 'ai'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
}

const variantClasses: Record<CardVariant, string> = {
  default: 'card',
  elevated: 'bg-grafana-elevated border border-border-medium rounded-lg shadow-elevated',
  ai: 'card-ai bg-grafana-secondary',
}

export function Card({ variant = 'default', className, children, ...props }: CardProps) {
  return (
    <div className={cn(variantClasses[variant], className)} {...props}>
      {children}
    </div>
  )
}
