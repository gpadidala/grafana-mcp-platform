import { useEffect, useState, type ReactNode } from 'react'
import { X, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { create } from 'zustand'

type ToastVariant = 'success' | 'warning' | 'error' | 'info'

interface ToastItem {
  id: string
  message: string
  variant: ToastVariant
  duration?: number
}

interface ToastState {
  toasts: ToastItem[]
  addToast: (message: string, variant?: ToastVariant, duration?: number) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, variant = 'info', duration = 4000) => {
    const id = Math.random().toString(36).slice(2, 9)
    set((s) => ({ toasts: [...s.toasts, { id, message, variant, duration }] }))
    if (duration > 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
      }, duration)
    }
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

const icons: Record<ToastVariant, ReactNode> = {
  success: <CheckCircle className="w-4 h-4 text-status-success" />,
  warning: <AlertTriangle className="w-4 h-4 text-status-warning" />,
  error: <XCircle className="w-4 h-4 text-status-error" />,
  info: <Info className="w-4 h-4 text-ai" />,
}

const borderColors: Record<ToastVariant, string> = {
  success: 'border-l-status-success',
  warning: 'border-l-status-warning',
  error: 'border-l-status-error',
  info: 'border-l-ai',
}

function ToastItemComponent({ toast }: { toast: ToastItem }) {
  const { removeToast } = useToastStore()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 pr-4 rounded-lg bg-grafana-elevated border border-border-medium border-l-2',
        'shadow-elevated transition-all duration-300',
        borderColors[toast.variant],
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      )}
    >
      <span className="mt-0.5 flex-shrink-0">{icons[toast.variant]}</span>
      <p className="text-sm text-text-primary flex-1">{toast.message}</p>
      <button
        onClick={() => removeToast(toast.id)}
        className="text-text-disabled hover:text-text-secondary transition-colors flex-shrink-0 mt-0.5"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export function ToastContainer() {
  const { toasts } = useToastStore()

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto animate-slide-up">
          <ToastItemComponent toast={t} />
        </div>
      ))}
    </div>
  )
}
