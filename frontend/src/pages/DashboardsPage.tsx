import { useState } from 'react'
import { Search, Sparkles, LayoutDashboard, ExternalLink, Plus, Tag, Folder } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { grafanaApi } from '@/services/api'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'

interface GrafanaDashboard {
  uid: string
  title: string
  url?: string
  tags?: string[]
  folderId?: number
  folderTitle?: string
  type?: string
}

function DashboardCard({ dashboard }: { dashboard: GrafanaDashboard }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden transition-all duration-200 group cursor-pointer',
        hovered ? 'border-border-medium shadow-elevated' : 'border-border-weak',
      )}
      style={{ background: 'var(--color-bg-secondary)', border: `1px solid ${hovered ? 'var(--color-border-medium)' : 'var(--color-border-weak)'}` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Preview area */}
      <div
        className="h-28 flex items-center justify-center"
        style={{ background: 'var(--color-bg-primary)', borderBottom: '1px solid var(--color-border-weak)' }}
      >
        <LayoutDashboard className="w-8 h-8 text-text-disabled opacity-40" />
      </div>

      <div className="p-3">
        <h3 className="text-sm font-semibold text-text-primary truncate group-hover:text-white transition-colors">
          {dashboard.title}
        </h3>

        {dashboard.folderTitle && (
          <div className="flex items-center gap-1 mt-1 text-[11px] text-text-disabled">
            <Folder className="w-3 h-3" />
            {dashboard.folderTitle}
          </div>
        )}

        {(dashboard.tags?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {dashboard.tags?.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px]"
                style={{ background: 'var(--color-bg-overlay)', color: 'var(--color-text-disabled)', border: '1px solid var(--color-border-weak)' }}
              >
                <Tag className="w-2.5 h-2.5" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Hover actions */}
        <div className={cn(
          'flex items-center gap-1.5 mt-3 transition-opacity duration-150',
          hovered ? 'opacity-100' : 'opacity-0'
        )}>
          <button className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium text-ai hover:bg-ai-muted transition-colors border border-[rgba(61,157,243,0.2)]">
            <ExternalLink className="w-3 h-3" />
            Open
          </button>
          <button className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium text-text-disabled hover:text-text-secondary hover:bg-grafana-elevated transition-colors border border-border-weak">
            Investigate
          </button>
        </div>
      </div>
    </div>
  )
}

export function DashboardsPage() {
  const [query, setQuery] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboards', query],
    queryFn: () => grafanaApi.searchDashboards(query || undefined).then((r) => r.data as GrafanaDashboard[]),
    retry: 1,
    refetchInterval: 60000,
  })

  const dashboards: GrafanaDashboard[] = Array.isArray(data) ? data : []

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="flex-shrink-0 px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--color-border-weak)' }}
      >
        <div>
          <h1 className="text-lg font-bold text-white">Dashboards</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {dashboards.length > 0 ? `${dashboards.length} dashboards` : 'Browse Grafana dashboards'}
          </p>
        </div>

        <button
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, rgba(61,157,243,0.2), rgba(157,111,212,0.15))',
            border: '1px solid rgba(61,157,243,0.3)',
            color: 'var(--color-ai)',
          }}
        >
          <Sparkles className="w-4 h-4" />
          Create with AI
        </button>
      </div>

      {/* Search */}
      <div className="flex-shrink-0 px-6 py-3" style={{ borderBottom: '1px solid var(--color-border-weak)' }}>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-disabled" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search dashboards..."
            className="input pl-8 text-sm"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border-weak)', background: 'var(--color-bg-secondary)' }}>
                <Skeleton height={112} className="rounded-none" />
                <div className="p-3 space-y-2">
                  <Skeleton height={14} width="80%" />
                  <Skeleton height={11} width="50%" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={<LayoutDashboard className="w-10 h-10" />}
            heading="Could not load dashboards"
            subtext="Check your Grafana connection in Settings"
            action={
              <button className="btn-ghost text-sm">Go to Settings</button>
            }
          />
        ) : dashboards.length === 0 ? (
          <EmptyState
            icon={<LayoutDashboard className="w-10 h-10" />}
            heading={query ? `No dashboards matching "${query}"` : 'No dashboards found'}
            subtext="Try a different search or connect to Grafana"
            action={
              <button className="btn-ai flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg">
                <Plus className="w-4 h-4" />
                Create Dashboard with AI
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {dashboards.map((d) => (
              <DashboardCard key={d.uid} dashboard={d} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
