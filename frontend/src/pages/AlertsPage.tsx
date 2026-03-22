import { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronRight, Filter, RefreshCw, Search, Zap } from 'lucide-react'
import { useChatStore } from '@/store/chatStore'
import { useLLMStore } from '@/store/llmStore'
import { clsx } from 'clsx'
type Page = string

interface AlertsPageProps {
  onNavigate: (page: Page) => void
}

type Severity = 'P1' | 'P2' | 'P3' | 'P4'
type AlertStatus = 'firing' | 'pending' | 'resolved'

interface MockAlert {
  id: string
  name: string
  severity: Severity
  status: AlertStatus
  service: string
  namespace: string
  description: string
  firedAt: string
  labels: Record<string, string>
  value: string
}

const MOCK_ALERTS: MockAlert[] = [
  {
    id: 'a1',
    name: 'HighErrorRate',
    severity: 'P1',
    status: 'firing',
    service: 'checkout',
    namespace: 'production',
    description: 'Error rate on checkout service exceeded 5% threshold (currently 12.3%)',
    firedAt: '14 min ago',
    labels: { app: 'checkout', env: 'prod', team: 'payments' },
    value: '12.3%',
  },
  {
    id: 'a2',
    name: 'HighLatencyP99',
    severity: 'P2',
    status: 'firing',
    service: 'payment-gateway',
    namespace: 'production',
    description: 'P99 latency exceeded 2s SLO (currently 8.2s)',
    firedAt: '22 min ago',
    labels: { app: 'payment-gateway', env: 'prod', team: 'payments' },
    value: '8.2s',
  },
  {
    id: 'a3',
    name: 'PodCrashLooping',
    severity: 'P2',
    status: 'firing',
    service: 'order-service',
    namespace: 'production',
    description: 'order-service-7d8f9c-xyz has been crash-looping for 18 minutes',
    firedAt: '18 min ago',
    labels: { app: 'order-service', env: 'prod', team: 'orders' },
    value: '12 restarts',
  },
  {
    id: 'a4',
    name: 'DatabaseConnectionPoolExhausted',
    severity: 'P3',
    status: 'firing',
    service: 'postgres-primary',
    namespace: 'data',
    description: 'Connection pool utilization above 90% (currently 94.7%)',
    firedAt: '31 min ago',
    labels: { app: 'postgres', env: 'prod', team: 'platform' },
    value: '94.7%',
  },
  {
    id: 'a5',
    name: 'HighMemoryUsage',
    severity: 'P3',
    status: 'pending',
    service: 'inventory-service',
    namespace: 'production',
    description: 'Memory usage approaching OOM threshold (currently 88%)',
    firedAt: '5 min ago',
    labels: { app: 'inventory', env: 'prod', team: 'catalog' },
    value: '88%',
  },
  {
    id: 'a6',
    name: 'SlowTraces',
    severity: 'P4',
    status: 'firing',
    service: 'search-api',
    namespace: 'production',
    description: '15% of search traces taking > 3s in the last 10 minutes',
    firedAt: '42 min ago',
    labels: { app: 'search-api', env: 'prod', team: 'search' },
    value: '15% slow',
  },
]

const SEVERITY_CONFIG: Record<Severity, { label: string; bg: string; text: string; border: string; glow: string }> = {
  P1: { label: 'P1 Critical', bg: 'bg-red-950/60', text: 'text-red-400', border: 'border-red-700/60', glow: 'shadow-glow-green' },
  P2: { label: 'P2 High', bg: 'bg-orange-950/60', text: 'text-orange-400', border: 'border-orange-700/60', glow: '' },
  P3: { label: 'P3 Medium', bg: 'bg-yellow-950/60', text: 'text-yellow-400', border: 'border-yellow-700/60', glow: '' },
  P4: { label: 'P4 Low', bg: 'bg-blue-950/60', text: 'text-blue-400', border: 'border-blue-700/60', glow: '' },
}

const STATUS_CONFIG: Record<AlertStatus, { label: string; color: string }> = {
  firing: { label: 'Firing', color: 'text-red-400' },
  pending: { label: 'Pending', color: 'text-yellow-400' },
  resolved: { label: 'Resolved', color: 'text-green-400' },
}

function AlertCard({ alert, onInvestigate }: { alert: MockAlert; onInvestigate: (alert: MockAlert) => void }) {
  const [expanded, setExpanded] = useState(false)
  const sev = SEVERITY_CONFIG[alert.severity]
  const status = STATUS_CONFIG[alert.status]
  const isP1 = alert.severity === 'P1'

  return (
    <div className={clsx(
      'glass rounded-xl border overflow-hidden transition-all duration-200',
      sev.border,
      isP1 && 'animate-glow-pulse',
    )}>
      <div className="flex items-start gap-3 p-4">
        {/* Severity indicator */}
        <div className={clsx('flex-shrink-0 px-2 py-1 rounded-lg text-xs font-bold', sev.bg, sev.text)}>
          {alert.severity}
        </div>

        {/* Alert info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-semibold text-sm text-white">{alert.name}</span>
                {isP1 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-900/40 text-red-400 border border-red-800/40 animate-pulse">
                    CRITICAL
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-2">
                <span className="text-gray-400 font-medium">{alert.service}</span>
                <span className="text-gray-700">·</span>
                <span>{alert.namespace}</span>
                <span className="text-gray-700">·</span>
                <span className={status.color}>{status.label}</span>
                <span className="text-gray-700">·</span>
                <span>{alert.firedAt}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className={clsx('px-2 py-1 rounded-lg text-xs font-mono font-bold', sev.bg, sev.text)}>
                {alert.value}
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-2 leading-relaxed">
            {alert.description}
          </p>

          {/* Labels */}
          {expanded && (
            <div className="flex flex-wrap gap-1.5 mt-3 animate-fade-in">
              {Object.entries(alert.labels).map(([k, v]) => (
                <span key={k} className="px-2 py-0.5 rounded-full text-[10px] bg-gray-800/60 border border-gray-700/50 text-gray-400">
                  <span className="text-gray-600">{k}=</span>{v}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => onInvestigate(alert)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                       bg-gradient-to-r from-orange-600 to-orange-500
                       hover:from-orange-500 hover:to-amber-500
                       text-white text-xs font-medium
                       transition-all duration-200 shadow-glow-sm hover:shadow-glow-orange"
          >
            <Zap className="w-3 h-3" />
            Investigate
          </button>
          <button
            onClick={() => setExpanded(v => !v)}
            className="p-1.5 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-gray-800/60 transition-all"
          >
            {expanded
              ? <ChevronDown className="w-4 h-4" />
              : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}

export function AlertsPage({ onNavigate }: AlertsPageProps) {
  const [filterSeverity, setFilterSeverity] = useState<Severity | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<AlertStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const { createSession, setActiveSession } = useChatStore()
  const { config } = useLLMStore()

  const handleRefresh = () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 1000)
  }

  const handleInvestigate = (alert: MockAlert) => {
    const id = createSession(config.provider, config.model)
    setActiveSession(id)
    sessionStorage.setItem('pending_prompt',
      `Investigate the ${alert.name} alert on ${alert.service} service. ` +
      `Current value: ${alert.value}. ${alert.description}. ` +
      `Check metrics, logs, and traces for root cause.`)
    onNavigate('chat')
  }

  const firingCount = MOCK_ALERTS.filter(a => a.status === 'firing').length
  const p1Count = MOCK_ALERTS.filter(a => a.severity === 'P1').length

  const filtered = MOCK_ALERTS.filter(alert => {
    if (filterSeverity !== 'all' && alert.severity !== filterSeverity) return false
    if (filterStatus !== 'all' && alert.status !== filterStatus) return false
    if (searchQuery && !alert.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !alert.service.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-5 animate-fade-in">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-white">Alert Feed</h1>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full
                               bg-red-500/10 border border-red-500/30 text-xs font-medium text-red-400">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                LIVE
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {firingCount} firing · {p1Count > 0 ? <span className="text-red-400">{p1Count} critical</span> : '0 critical'} · AI investigation ready
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass border border-gray-700/50
                       text-xs text-gray-400 hover:text-white hover:border-gray-600
                       transition-all duration-200"
          >
            <RefreshCw className={clsx('w-3.5 h-3.5', refreshing && 'animate-spin')} />
            Refresh
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(['P1', 'P2', 'P3', 'P4'] as Severity[]).map(sev => {
            const count = MOCK_ALERTS.filter(a => a.severity === sev).length
            const cfg = SEVERITY_CONFIG[sev]
            return (
              <button
                key={sev}
                onClick={() => setFilterSeverity(filterSeverity === sev ? 'all' : sev)}
                className={clsx(
                  'p-3 rounded-xl border text-center transition-all duration-200 card-hover',
                  filterSeverity === sev
                    ? `${cfg.bg} ${cfg.border}`
                    : 'glass border-gray-800/60 hover:border-gray-700'
                )}
              >
                <div className={clsx('text-2xl font-bold', cfg.text)}>{count}</div>
                <div className="text-xs text-gray-500 mt-0.5">{sev} {sev === 'P1' ? 'Critical' : sev === 'P2' ? 'High' : sev === 'P3' ? 'Medium' : 'Low'}</div>
              </button>
            )
          })}
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl glass border border-gray-800/60 flex-1 min-w-48">
            <Search className="w-4 h-4 text-gray-600 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search alerts..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent text-sm text-gray-300 placeholder-gray-600 outline-none w-full"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-600" />
            {(['all', 'firing', 'pending', 'resolved'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  filterStatus === s
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/60'
                )}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Alert list */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center">
              <AlertTriangle className="w-8 h-8 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No alerts match your filters</p>
            </div>
          ) : (
            filtered.map(alert => (
              <AlertCard key={alert.id} alert={alert} onInvestigate={handleInvestigate} />
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="text-center py-2">
          <p className="text-xs text-gray-700">
            Showing {filtered.length} of {MOCK_ALERTS.length} alerts ·
            Click "Investigate" to start an AI-powered RCA
          </p>
        </div>
      </div>
    </div>
  )
}
