import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, LayoutDashboard, ExternalLink, Pin } from 'lucide-react'
import { grafanaApi } from '@/services/api'

interface Dashboard {
  uid: string
  title: string
  url: string
  tags: string[]
  folderTitle?: string
}

export function DashboardExplorer() {
  const [search, setSearch] = useState('')
  const [pinnedUids, setPinnedUids] = useState<Set<string>>(new Set())

  const { data: dashboards = [], isLoading } = useQuery<Dashboard[]>({
    queryKey: ['dashboards', search],
    queryFn: async () => {
      const res = await grafanaApi.searchDashboards(search || undefined)
      return res.data
    },
    staleTime: 30_000,
  })

  const togglePin = (uid: string) => {
    setPinnedUids(prev => {
      const next = new Set(prev)
      if (next.has(uid)) next.delete(uid)
      else next.add(uid)
      return next
    })
  }

  return (
    <div className="flex flex-col h-full bg-gray-950">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-sm font-semibold text-white mb-3">Dashboard Explorer</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search dashboards..."
            className="w-full pl-9 pr-3 py-2 bg-gray-800 rounded-lg text-sm text-gray-200
                       placeholder-gray-500 outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading && (
          <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
            Loading dashboards...
          </div>
        )}
        {dashboards.map(dash => (
          <div
            key={dash.uid}
            className="flex items-start gap-2 p-3 rounded-lg hover:bg-gray-800 group"
          >
            <LayoutDashboard className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-200 truncate">{dash.title}</p>
              {dash.folderTitle && (
                <p className="text-xs text-gray-500">{dash.folderTitle}</p>
              )}
              {dash.tags?.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {dash.tags.map(tag => (
                    <span key={tag}
                      className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => togglePin(dash.uid)}
                className={`p-1 rounded hover:bg-gray-700 ${
                  pinnedUids.has(dash.uid) ? 'text-orange-400' : 'text-gray-500'
                }`}
              >
                <Pin className="w-3.5 h-3.5" />
              </button>
              <a
                href={`${import.meta.env.VITE_GRAFANA_URL || 'http://localhost:3000'}${dash.url}`}
                target="_blank"
                rel="noreferrer"
                className="p-1 rounded hover:bg-gray-700 text-gray-500"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
        {!isLoading && dashboards.length === 0 && (
          <p className="text-center text-sm text-gray-500 py-8">
            No dashboards found
          </p>
        )}
      </div>
    </div>
  )
}
