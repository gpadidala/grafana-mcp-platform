import { cn } from '@/lib/utils'

interface AIAvatarProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  breathing?: boolean
}

const sizeMap = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-20 h-20 text-2xl',
}

export function AIAvatar({ size = 'md', className, breathing = true }: AIAvatarProps) {
  return (
    <div
      className={cn(
        'relative flex items-center justify-center rounded-full flex-shrink-0',
        'bg-gradient-to-br from-[rgba(61,157,243,0.2)] to-[rgba(157,111,212,0.15)]',
        'border border-[rgba(61,157,243,0.3)]',
        breathing && 'animate-ai-breathe',
        sizeMap[size],
        className
      )}
    >
      <span className="select-none">✦</span>
    </div>
  )
}
