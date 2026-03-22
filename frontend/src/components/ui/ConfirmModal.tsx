import { AlertTriangle, Loader2 } from 'lucide-react'
import { Modal } from './Modal'

export interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
  isLoading?: boolean
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel  = 'Cancel',
  variant      = 'default',
  isLoading    = false,
}: ConfirmModalProps) {
  const isDanger = variant === 'danger'

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: isDanger
              ? 'rgba(242,73,92,0.12)'
              : 'var(--color-bg-overlay)',
            border: `1px solid ${
              isDanger
                ? 'rgba(242,73,92,0.3)'
                : 'var(--color-border-medium)'
            }`,
          }}
        >
          <AlertTriangle
            className="w-5 h-5"
            style={{
              color: isDanger
                ? 'var(--color-error)'
                : 'var(--color-text-secondary)',
            }}
          />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-text-primary mb-1 leading-snug">
            {title}
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 mt-6">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="btn-ghost px-4 py-2 text-sm"
        >
          {cancelLabel}
        </button>

        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={
            isDanger
              ? 'btn-danger flex items-center gap-2 px-4 py-2 text-sm'
              : 'btn-primary flex items-center gap-2 px-4 py-2 text-sm'
          }
        >
          {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {isLoading ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
