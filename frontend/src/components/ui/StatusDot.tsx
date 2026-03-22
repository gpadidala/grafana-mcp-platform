import { cn } from '@/lib/utils'

type StatusColor = 'green' | 'yellow' | 'red' | 'blue' | 'gray'

interface StatusDotProps {
  color?: StatusColor
  pulse?: boolean
  size?: 'sm' | 'md'
  className?: string
}

const colorMap: Record<StatusColor, string> = {
  green: 'bg-status-success',
  yellow: 'bg-status-warning',
  red: 'bg-status-error',
  blue: 'bg-ai',
  gray: 'bg-text-disabled',
}

const pulseColorMap: Record<StatusColor, string> = {
  green: 'bg-status-success',
  yellow: 'bg-status-warning',
  red: 'bg-status-error',
  blue: 'bg-ai',
  gray: 'bg-text-disabled',
}

export function StatusDot({ color = 'green', pulse, size = 'sm', className }: StatusDotProps) {
  const sizeClass = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5'

  return (
    <span className={cn('relative inline-flex', className)}>
      {pulse && (
        <span
          className={cn(
            'absolute inset-0 rounded-full opacity-75 animate-status-pulse',
            pulseColorMap[color]
          )}
        />
      )}
      <span className={cn('relative rounded-full', sizeClass, colorMap[color])} />
    </span>
  )
}
