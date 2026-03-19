import { MessageSquare, LayoutDashboard, Bell, Settings, RefreshCw } from 'lucide-react'
import { useChatStore } from '@/store/chatStore'
import { useLLMStore } from '@/store/llmStore'
import { clsx } from 'clsx'

const NAV_ITEMS = [
  { icon: MessageSquare, label: 'Chat', href: '#chat' },
  { icon: LayoutDashboard, label: 'Dashboards', href: '#dashboards' },
  { icon: Bell, label: 'Alerts', href: '#alerts' },
  { icon: Settings, label: 'Settings', href: '#settings' },
]

export function Sidebar() {
  const { sessions, activeSessionId, setActiveSession, createSession } = useChatStore()
  const { config } = useLLMStore()

  return (
    <div className="flex flex-col h-full bg-gray-900 border-r border-gray-800 w-64">
      {/* Logo */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">G</span>
          </div>
          <span className="font-semibold text-white">Grafana MCP</span>
        </div>
      </div>

      {/* New Chat button */}
      <div className="p-3 border-b border-gray-800">
        <button
          onClick={() => createSession(config.provider, config.model)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg
                     bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium
                     transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          New Conversation
        </button>
      </div>

      {/* Chat history */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sessions.map(session => (
          <button
            key={session.id}
            onClick={() => setActiveSession(session.id)}
            className={clsx(
              'w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors',
              activeSessionId === session.id
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
            )}
          >
            {session.title}
          </button>
        ))}
        {sessions.length === 0 && (
          <p className="text-gray-600 text-xs px-3 py-4 text-center">
            No conversations yet
          </p>
        )}
      </div>

      {/* Bottom nav */}
      <div className="border-t border-gray-800 p-2 space-y-1">
        {NAV_ITEMS.slice(1).map(({ icon: Icon, label, href }) => (
          <a
            key={label}
            href={href}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400
                       hover:bg-gray-800 hover:text-gray-200 text-sm transition-colors"
          >
            <Icon className="w-4 h-4" />
            {label}
          </a>
        ))}
      </div>
    </div>
  )
}
