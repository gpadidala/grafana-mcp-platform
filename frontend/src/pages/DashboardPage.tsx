import { useState, useEffect } from 'react'
import { MessageSquare, Wrench, Cpu, Activity, ArrowRight, Search, BarChart2, AlignLeft, GitBranch, AlertTriangle } from 'lucide-react'
import { useChatStore } from '@/store/chatStore'
import { useLLMStore } from '@/store/llmStore'
import { PROVIDER_DISPLAY_NAMES } from '@/types/llm'
type Page = string

interface DashboardPageProps {
  onNavigate: (page: Page) => void
}

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
  borderColor: string
  sublabel?: string
  animate?: boolean
}

function StatCard({ label, value, icon, color, borderColor, sublabel, animate }: StatCardProps) {
  return (
    <div className={`glass rounded-2xl p-5 card-hover relative overflow-hidden`}
         style={{ borderTop: `2px solid ${borderColor}` }}>
      {/* Background glow */}
      <div className="absolute inset-0 opacity-5 rounded-2xl"
           style={{ background: `radial-gradient(circle at top left, ${borderColor}, transparent 70%)` }} />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
            {icon}
          </div>
          {animate && (
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          )}
        </div>
        <div className="text-2xl font-bold text-white mb-0.5">{value}</div>
        <div className="text-sm font-medium text-gray-300">{label}</div>
        {sublabel && <div className="text-xs text-gray-600 mt-0.5">{sublabel}</div>}
      </div>
    </div>
  )
}

const QUICK_ACTIONS = [
  {
    icon: '🚨',
    title: 'Incident Investigation',
    desc: 'Start an AI-powered RCA for a production incident',
    prompt: 'Investigate the current production incident. Check error rates, recent logs, and traces.',
    color: 'from-red-900/30 to-red-950/20',
    border: 'border-red-800/40',
    hoverBorder: 'hover:border-red-600/60',
    tag: 'P1 Ready',
    tagColor: 'bg-red-900/40 text-red-400',
  },
  {
    icon: '📊',
    title: 'Query Metrics',
    desc: 'Analyze service performance and SLO burn rates',
    prompt: 'Show me the error rate, P99 latency, and throughput for all services in the last hour.',
    color: 'from-purple-900/30 to-purple-950/20',
    border: 'border-purple-800/40',
    hoverBorder: 'hover:border-purple-600/60',
    tag: 'Mimir',
    tagColor: 'bg-purple-900/40 text-purple-400',
  },
  {
    icon: '📋',
    title: 'Search Logs',
    desc: 'Find patterns and errors in log streams',
    prompt: 'Search for ERROR and FATAL log entries in the last 15 minutes across all services.',
    color: 'from-yellow-900/30 to-yellow-950/20',
    border: 'border-yellow-800/40',
    hoverBorder: 'hover:border-yellow-600/60',
    tag: 'Loki',
    tagColor: 'bg-yellow-900/40 text-yellow-400',
  },
  {
    icon: '🔍',
    title: 'Analyze Traces',
    desc: 'Find slow spans and distributed trace bottlenecks',
    prompt: 'Show me traces with latency > 2 seconds from the last 30 minutes. Which services are slowest?',
    color: 'from-cyan-900/30 to-cyan-950/20',
    border: 'border-cyan-800/40',
    hoverBorder: 'hover:border-cyan-600/60',
    tag: 'Tempo',
    tagColor: 'bg-cyan-900/40 text-cyan-400',
  },
  {
    icon: '🔥',
    title: 'Profile Analysis',
    desc: 'Investigate CPU and memory hotspots',
    prompt: 'Query Pyroscope for the top CPU-consuming functions in the last hour.',
    color: 'from-orange-900/30 to-orange-950/20',
    border: 'border-orange-800/40',
    hoverBorder: 'hover:border-orange-600/60',
    tag: 'Pyroscope',
    tagColor: 'bg-orange-900/40 text-orange-400',
  },
  {
    icon: '🌐',
    title: 'Frontend Vitals',
    desc: 'Check Core Web Vitals and user experience',
    prompt: 'What are the current Core Web Vitals (LCP, CLS, INP)? Are there any frontend errors?',
    color: 'from-pink-900/30 to-pink-950/20',
    border: 'border-pink-800/40',
    hoverBorder: 'hover:border-pink-600/60',
    tag: 'Faro',
    tagColor: 'bg-pink-900/40 text-pink-400',
  },
]

const SIGNAL_STACK = [
  { name: 'Mimir', desc: 'Metrics & PromQL', color: '#C084FC', icon: <BarChart2 className="w-4 h-4" />, status: 'connected' },
  { name: 'Loki', desc: 'Logs & LogQL', color: '#FACC15', icon: <AlignLeft className="w-4 h-4" />, status: 'connected' },
  { name: 'Tempo', desc: 'Traces & TraceQL', color: '#22D3EE', icon: <GitBranch className="w-4 h-4" />, status: 'connected' },
  { name: 'Pyroscope', desc: 'Continuous Profiling', color: '#FB923C', icon: <Activity className="w-4 h-4" />, status: 'connected' },
  { name: 'Faro', desc: 'Real User Monitoring', color: '#F472B6', icon: <Search className="w-4 h-4" />, status: 'connected' },
]

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { sessions, createSession, setActiveSession } = useChatStore()
  const { config } = useLLMStore()
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const handleQuickAction = (prompt: string) => {
    const id = createSession(config.provider, config.model)
    setActiveSession(id)
    onNavigate('chat')
    // Store the prompt for auto-send — could be enhanced with a store action
    sessionStorage.setItem('pending_prompt', prompt)
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6 animate-fade-in">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              <span className="gradient-text">Command Center</span>
            </h1>
            <p className="text-sm text-gray-500">
              AI-powered observability overview · {time.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl glass border border-gray-800/60 text-xs text-gray-400">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Live · {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Active Conversations"
            value={sessions.length}
            icon={<MessageSquare className="w-5 h-5 text-orange-400" />}
            color="bg-orange-500/15"
            borderColor="#f97316"
            sublabel={sessions.length === 1 ? '1 session open' : `${sessions.length} sessions open`}
            animate
          />
          <StatCard
            label="MCP Tools"
            value="12+"
            icon={<Wrench className="w-5 h-5 text-purple-400" />}
            color="bg-purple-500/15"
            borderColor="#a855f7"
            sublabel="Grafana stack connected"
          />
          <StatCard
            label="LLM Provider"
            value={PROVIDER_DISPLAY_NAMES[config.provider]}
            icon={<Cpu className="w-5 h-5 text-blue-400" />}
            color="bg-blue-500/15"
            borderColor="#3b82f6"
            sublabel={config.model}
          />
          <StatCard
            label="System Status"
            value="Healthy"
            icon={<Activity className="w-5 h-5 text-green-400" />}
            color="bg-green-500/15"
            borderColor="#22c55e"
            sublabel="All signals operational"
            animate
          />
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Quick Actions — 2/3 width */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white">Quick Actions</h2>
              <span className="px-2 py-0.5 rounded-full text-xs bg-orange-500/10 text-orange-400 border border-orange-500/20">
                AI Ready
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {QUICK_ACTIONS.map(action => (
                <button
                  key={action.title}
                  onClick={() => handleQuickAction(action.prompt)}
                  className={`text-left p-4 rounded-xl bg-gradient-to-br ${action.color}
                              border ${action.border} ${action.hoverBorder}
                              transition-all duration-200 card-hover group`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-2xl">{action.icon}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${action.tagColor}`}>
                        {action.tag}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400
                                            group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                  <div className="font-semibold text-sm text-white mb-1">{action.title}</div>
                  <div className="text-xs text-gray-400 leading-relaxed">{action.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Signal Stack Status */}
            <div>
              <h2 className="text-base font-semibold text-white mb-3">Signal Stack</h2>
              <div className="glass rounded-2xl overflow-hidden divide-y divide-gray-800/50">
                {SIGNAL_STACK.map(signal => (
                  <div key={signal.name} className="flex items-center gap-3 px-4 py-3 hover:bg-white/2 transition-colors">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                         style={{ background: `${signal.color}20`, color: signal.color }}>
                      {signal.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-200">{signal.name}</div>
                      <div className="text-xs text-gray-600">{signal.desc}</div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span className="text-xs text-green-500">Live</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent sessions */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-white">Recent Sessions</h2>
                <button
                  onClick={() => onNavigate('chat')}
                  className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
                >
                  View all
                </button>
              </div>
              <div className="space-y-2">
                {sessions.length === 0 ? (
                  <div className="glass rounded-xl p-4 text-center">
                    <MessageSquare className="w-6 h-6 text-gray-700 mx-auto mb-2" />
                    <p className="text-xs text-gray-600">No conversations yet.<br />Start one with a Quick Action above.</p>
                  </div>
                ) : (
                  sessions.slice(0, 5).map(session => (
                    <button
                      key={session.id}
                      onClick={() => { setActiveSession(session.id); onNavigate('chat') }}
                      className="w-full text-left glass rounded-xl p-3
                                 hover:border-orange-500/30 transition-all duration-200 group"
                    >
                      <div className="flex items-start gap-2.5">
                        <MessageSquare className="w-3.5 h-3.5 text-gray-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-300 truncate">
                            {session.title}
                          </div>
                          <div className="text-[10px] text-gray-600 mt-0.5">
                            {session.messages.length} messages · {session.provider}
                          </div>
                        </div>
                        <ArrowRight className="w-3 h-3 text-gray-700 group-hover:text-orange-400
                                               group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-0.5" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Alert summary */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-white">Alert Summary</h2>
                <button
                  onClick={() => onNavigate('alerts')}
                  className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
                >
                  View alerts
                </button>
              </div>
              <div className="glass rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-500">Status as of {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="flex items-center gap-1 text-xs text-orange-400">
                    <AlertTriangle className="w-3 h-3" />
                    3 active
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-red-950/30 border border-red-900/40">
                    <div className="text-lg font-bold text-red-400">1</div>
                    <div className="text-[10px] text-red-600">P1</div>
                  </div>
                  <div className="p-2 rounded-lg bg-orange-950/30 border border-orange-900/40">
                    <div className="text-lg font-bold text-orange-400">2</div>
                    <div className="text-[10px] text-orange-600">P2</div>
                  </div>
                  <div className="p-2 rounded-lg bg-gray-800/40 border border-gray-700/40">
                    <div className="text-lg font-bold text-gray-400">0</div>
                    <div className="text-[10px] text-gray-600">P3</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
