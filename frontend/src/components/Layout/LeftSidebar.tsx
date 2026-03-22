import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Search, LayoutDashboard, Wrench, BookOpen,
  Settings, Plus, Trash2, ChevronLeft, ChevronRight, Zap,
} from 'lucide-react'
import { useChatStore } from '@/store/chatStore'
import { useLLMStore } from '@/store/llmStore'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'
import { formatRelativeTime, truncate } from '@/lib/utils'

const NAV_ITEMS = [
  { icon: MessageSquare, label: 'Chat',          path: '/chat' },
  { icon: Search,        label: 'Investigate',   path: '/investigate' },
  { icon: LayoutDashboard, label: 'Dashboards',  path: '/dashboards' },
  { icon: Wrench,        label: 'Query Builder', path: '/query' },
  { icon: BookOpen,      label: 'Skills',        path: '/skills' },
  { icon: Settings,      label: 'Settings',      path: '/settings' },
]

export function LeftSidebar() {
  const { sessions, activeSessionId, setActiveSession, createSession, deleteSession } = useChatStore()
  const { config } = useLLMStore()
  const { sidebarCollapsed, toggleSidebarCollapsed } = useUIStore()
  const navigate = useNavigate()

  const handleNewChat = () => {
    const id = createSession(config.provider, config.model)
    void id
    navigate('/chat')
  }

  const handleSelectSession = (id: string) => {
    setActiveSession(id)
    navigate('/chat')
  }

  const width = sidebarCollapsed ? 56 : 260

  return (
    <motion.aside
      animate={{ width }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="flex flex-col h-full overflow-hidden relative flex-shrink-0"
      style={{ background: '#0D1321', borderRight: '1px solid rgba(59,130,246,0.1)' }}
    >
      {/* Right edge ambient glow */}
      <div
        className="absolute right-0 top-1/4 bottom-1/4 w-px pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, rgba(59,130,246,0.2), transparent)' }}
      />

      {/* Logo */}
      <div
        className={cn(
          'flex items-center gap-3 flex-shrink-0 h-14',
          sidebarCollapsed ? 'px-3 justify-center' : 'px-4',
        )}
        style={{ borderBottom: '1px solid rgba(59,130,246,0.08)' }}
      >
        {/* Logo mark */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-white text-13 select-none"
          style={{
            background: 'linear-gradient(135deg, #1D4ED8, #0EA5E9)',
            boxShadow: '0 0 16px rgba(59,130,246,0.4)',
          }}
        >
          N
        </div>

        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="font-bold text-16 leading-tight gradient-text-ai whitespace-nowrap">
                NovaSRE
              </div>
              <div className="text-11 leading-tight text-on-subtle whitespace-nowrap">
                AI Command Centre
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* New Chat */}
      <div
        className={cn('flex-shrink-0', sidebarCollapsed ? 'p-2' : 'px-3 py-3')}
        style={{ borderBottom: '1px solid rgba(59,130,246,0.08)' }}
      >
        <motion.button
          onClick={handleNewChat}
          whileTap={{ scale: 0.97 }}
          title="New Chat"
          className={cn(
            'flex items-center gap-2 rounded-lg font-semibold text-13 text-white transition-all duration-150',
            sidebarCollapsed ? 'w-10 h-10 justify-center mx-auto' : 'w-full px-3 h-9',
          )}
          style={{ background: 'linear-gradient(135deg, #1D4ED8, #0EA5E9)', boxShadow: '0 2px 12px rgba(59,130,246,0.3)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.filter = '' }}
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          {!sidebarCollapsed && <span>New Chat</span>}
        </motion.button>
      </div>

      {/* Nav */}
      <nav className={cn('flex-shrink-0 py-2', sidebarCollapsed ? 'px-2' : 'px-2')}>
        {NAV_ITEMS.map(({ icon: Icon, label, path }) => (
          <NavLink
            key={path}
            to={path}
            title={sidebarCollapsed ? label : undefined}
          >
            {({ isActive }) => (
              <motion.div
                whileHover={{ x: sidebarCollapsed ? 0 : 2 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={cn(
                  'flex items-center gap-2.5 rounded-md text-13 font-medium transition-colors duration-150 mb-0.5 cursor-pointer select-none',
                  sidebarCollapsed ? 'w-10 h-9 mx-auto justify-center' : 'px-3 h-9',
                  isActive
                    ? 'nav-active-item-navy'
                    : 'text-on-muted hover:bg-white/[0.04] hover:text-on-primary',
                )}
              >
                <Icon
                  className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-accent-blue' : '')}
                />
                {!sidebarCollapsed && <span>{label}</span>}
              </motion.div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Recent conversations */}
      <AnimatePresence>
        {!sidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2 min-h-0"
          >
            <div className="px-2 py-1.5 mb-1">
              <span className="text-10 font-semibold uppercase tracking-widest text-on-subtle">
                Recent
              </span>
            </div>

            {sessions.length === 0 ? (
              <div className="flex flex-col items-center py-8 px-3 text-center">
                <MessageSquare className="w-5 h-5 mb-2 text-on-subtle" />
                <p className="text-12 text-on-subtle">No conversations yet</p>
              </div>
            ) : (
              sessions.map((session) => (
                <div key={session.id} className="group relative">
                  <button
                    onClick={() => handleSelectSession(session.id)}
                    className={cn(
                      'w-full text-left rounded-md px-2.5 py-2 mb-0.5 transition-colors duration-100',
                      activeSessionId === session.id
                        ? 'bg-blue-500/10 text-on-primary'
                        : 'text-on-muted hover:bg-white/[0.04] hover:text-on-primary',
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 opacity-40" />
                      <div className="flex-1 min-w-0">
                        <div className="text-12 font-medium truncate">
                          {truncate(session.title, 26)}
                        </div>
                        <div className="text-11 text-on-subtle mt-0.5 flex items-center gap-1">
                          <span>{formatRelativeTime(session.updatedAt)}</span>
                          <span className="opacity-40">·</span>
                          <span className="truncate">{session.model}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSession(session.id) }}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-on-muted hover:text-status-error-legacy"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {sidebarCollapsed && <div className="flex-1" />}

      {/* Bottom status */}
      <div
        className={cn('flex-shrink-0', sidebarCollapsed ? 'px-2 py-3' : 'px-3 py-3')}
        style={{ borderTop: '1px solid rgba(59,130,246,0.08)' }}
      >
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-2"
              style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.12)' }}
            >
              {/* Pulsing green dot */}
              <div className="relative flex-shrink-0">
                <div className="w-2 h-2 rounded-full bg-status-success" />
                <div className="absolute inset-0 rounded-full bg-status-success animate-ping opacity-60" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-12 font-semibold text-status-success">AI Online</div>
                <div className="text-11 text-on-subtle flex items-center gap-1 mt-0.5">
                  <Zap className="w-3 h-3 text-accent-blue" />
                  <span className="text-accent-blue">MCP Tools Active</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={toggleSidebarCollapsed}
          className={cn(
            'flex items-center justify-center rounded-md transition-colors duration-150 text-on-muted hover:bg-white/[0.04] hover:text-on-primary',
            sidebarCollapsed ? 'w-10 h-8 mx-auto' : 'w-full h-7',
          )}
          title={sidebarCollapsed ? 'Expand' : 'Collapse'}
        >
          {sidebarCollapsed
            ? <ChevronRight className="w-3.5 h-3.5" />
            : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>
    </motion.aside>
  )
}
