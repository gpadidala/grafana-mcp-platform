import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Wrench, BookOpen, History, CheckCircle, Loader } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { useQuery } from '@tanstack/react-query'
import { mcpApi } from '@/services/api'
import { cn } from '@/lib/utils'

type Tab = 'skills' | 'tools' | 'history'

const SKILLS_LIST = [
  { name: 'Service Health Check', desc: 'RED metrics + error logs + trace latency', tags: ['prometheus', 'loki', 'tempo'] },
  { name: 'Incident Investigation', desc: 'Full root cause analysis across all signals', tags: ['all'] },
  { name: 'SLO Burn Rate', desc: 'Compute burn rate and error budget remaining', tags: ['prometheus'] },
  { name: 'Log Error Digest', desc: 'Extract and deduplicate top error patterns', tags: ['loki'] },
  { name: 'Deployment Diff', desc: 'Compare profiles before/after deployment', tags: ['pyroscope'] },
  { name: 'Web Vitals Report', desc: 'Core Web Vitals across pages and sessions', tags: ['faro'] },
]

function SkillsTab() {
  return (
    <div className="space-y-2 p-3">
      {SKILLS_LIST.map((skill) => (
        <motion.div
          key={skill.name}
          whileHover={{ x: 2 }}
          className="rounded-xl p-3 cursor-pointer transition-colors duration-150 border border-blue-500/10 hover:border-blue-500/25"
          style={{ background: '#111827' }}
        >
          <div className="text-12 font-semibold text-on-primary mb-1">{skill.name}</div>
          <div className="text-11 text-on-subtle mb-2 leading-relaxed">{skill.desc}</div>
          <div className="flex flex-wrap gap-1">
            {skill.tags.map((t) => (
              <span key={t} className="px-1.5 py-0.5 rounded text-10 font-medium text-accent-blue border border-blue-500/20 bg-blue-500/8">
                {t}
              </span>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function ToolsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['mcp-tools'],
    queryFn: () => mcpApi.listTools().then((r) => r.data),
    retry: 1,
    refetchInterval: 30000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 gap-2 text-13 text-on-subtle">
        <Loader className="w-4 h-4 animate-spin" />
        Loading tools...
      </div>
    )
  }

  const tools: Array<{ name: string; description?: string }> = Array.isArray(data) ? data : []

  if (tools.length === 0) {
    return (
      <div className="flex flex-col items-center py-10 text-center px-4">
        <Wrench className="w-8 h-8 mb-3 text-on-subtle" />
        <p className="text-12 text-on-subtle">No MCP tools connected</p>
        <p className="text-11 text-on-subtle mt-1">Configure MCP server in Settings</p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5 p-3">
      {tools.map((tool) => (
        <div
          key={tool.name}
          className="flex items-start gap-2.5 rounded-lg p-2.5 border border-blue-500/8 hover:border-blue-500/2"
          style={{ background: '#111827' }}
        >
          <CheckCircle className="w-3.5 h-3.5 text-status-success flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-12 font-mono font-medium text-accent-blue truncate">{tool.name}</div>
            {tool.description && (
              <div className="text-11 text-on-subtle mt-0.5 line-clamp-2">{tool.description}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function HistoryTab() {
  const MOCK_HISTORY = [
    { query: 'What is the P99 latency for checkout service?', ts: '2m ago' },
    { query: 'Show error logs for payment service', ts: '15m ago' },
    { query: 'Why are traces slow for api-gateway?', ts: '1h ago' },
    { query: 'List all firing alerts', ts: '2h ago' },
  ]
  return (
    <div className="space-y-1.5 p-3">
      {MOCK_HISTORY.map((item, i) => (
        <div
          key={i}
          className="rounded-lg p-2.5 cursor-pointer border border-blue-500/8 hover:border-blue-500/25 transition-colors duration-150"
          style={{ background: '#111827' }}
        >
          <p className="text-12 text-on-muted line-clamp-2 leading-relaxed">{item.query}</p>
          <p className="text-11 text-on-subtle mt-1">{item.ts}</p>
        </div>
      ))}
    </div>
  )
}

export function RightPanel() {
  const { setRightPanelOpen, rightPanelTab, setRightPanelTab } = useUIStore()
  const [tab, setTab] = useState<Tab>(rightPanelTab)

  const tabs: { id: Tab; label: string; icon: typeof Wrench }[] = [
    { id: 'skills',  label: 'Skills',  icon: BookOpen },
    { id: 'tools',   label: 'Tools',   icon: Wrench },
    { id: 'history', label: 'History', icon: History },
  ]

  const handleTabChange = (t: Tab) => { setTab(t); setRightPanelTab(t) }

  return (
    <aside
      className="w-72 flex flex-col flex-shrink-0 overflow-hidden"
      style={{ background: '#0D1321', borderLeft: '1px solid rgba(59,130,246,0.1)' }}
    >
      <div
        className="flex items-center justify-between px-3 py-2.5 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(59,130,246,0.08)' }}
      >
        <div className="flex items-center gap-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleTabChange(id)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-12 font-medium transition-all duration-150',
                tab === id
                  ? 'bg-blue-500/12 text-accent-blue border border-blue-500/25'
                  : 'text-on-muted hover:text-on-primary hover:bg-white/[0.04]',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setRightPanelOpen(false)}
          className="p-1 rounded text-on-subtle hover:text-on-primary hover:bg-white/[0.04] transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {tab === 'skills'  && <SkillsTab />}
        {tab === 'tools'   && <ToolsTab />}
        {tab === 'history' && <HistoryTab />}
      </div>
    </aside>
  )
}
