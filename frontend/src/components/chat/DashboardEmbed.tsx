import { LayoutDashboard, Folder, ExternalLink, Plus } from 'lucide-react'

interface DashboardEmbedProps {
  uid: string
  title: string
  folderTitle?: string
  tags?: string[]
  url?: string
  panelCount?: number
  lastModified?: string
}

export function DashboardEmbed({
  uid,
  title,
  folderTitle,
  tags,
  url,
  panelCount,
  lastModified,
}: DashboardEmbedProps) {
  const dashboardUrl = url ?? `#/d/${uid}`

  return (
    <div
      className="rounded-xl overflow-hidden my-1.5 w-full"
      style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-weak)' }}
    >
      {/* Preview area */}
      <div
        className="flex items-center justify-center"
        style={{ height: 80, background: 'var(--color-bg-canvas)' }}
      >
        <LayoutDashboard
          style={{ width: 40, height: 40, color: 'var(--color-text-disabled)' }}
        />
      </div>

      {/* Info section */}
      <div className="px-3 pt-2.5 pb-1">
        <div className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
          {title}
        </div>

        {folderTitle && (
          <div className="flex items-center gap-1 mt-1">
            <Folder className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--color-text-disabled)' }} />
            <span className="text-xs" style={{ color: 'var(--color-text-disabled)' }}>
              {folderTitle}
            </span>
          </div>
        )}

        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 rounded text-[10px]"
                style={{
                  background: 'var(--color-bg-overlay)',
                  color: 'var(--color-text-disabled)',
                  border: '1px solid var(--color-border-weak)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-3 py-2 mt-1"
        style={{ borderTop: '1px solid var(--color-border-weak)' }}
      >
        <div className="flex items-center gap-3">
          {panelCount !== undefined && (
            <span className="text-[11px]" style={{ color: 'var(--color-text-disabled)' }}>
              {panelCount} panels
            </span>
          )}
          {lastModified && (
            <span className="text-[11px]" style={{ color: 'var(--color-text-disabled)' }}>
              Modified: {lastModified}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            className="btn-ghost text-xs flex items-center gap-1"
            style={{ fontSize: '11px' }}
          >
            <Plus className="w-3 h-3" />
            Add to Context
          </button>
          <a
            href={dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost text-xs flex items-center gap-1"
            style={{ fontSize: '11px', color: 'var(--color-ai)' }}
          >
            <ExternalLink className="w-3 h-3" />
            Open Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
