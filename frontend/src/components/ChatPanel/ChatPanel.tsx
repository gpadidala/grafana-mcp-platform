import { useEffect, useRef, useState, useCallback } from 'react'
import { Send, Square, Trash2, Cpu, Activity, Search, BarChart2, AlignLeft, GitBranch } from 'lucide-react'
import { MessageBubble } from './MessageBubble'
import { MCPToolsPanel } from '@/components/MCPToolsPanel/MCPToolsPanel'
import { useChatStore } from '@/store/chatStore'
import { useChat } from '@/hooks/useChat'

interface ChatPanelProps {
  sessionId: string
}

const SUGGESTIONS = [
  { icon: '🚨', text: 'Show me active firing alerts', label: 'Alerts' },
  { icon: '📊', text: "What's the error rate on the API service?", label: 'Metrics' },
  { icon: '📋', text: 'Search for dashboards tagged "production"', label: 'Dashboards' },
  { icon: '📝', text: 'Find ERROR logs in the last 15 minutes', label: 'Logs' },
  { icon: '🔍', text: 'Show me slow traces > 2 seconds', label: 'Traces' },
  { icon: '🔥', text: 'What services have high CPU usage right now?', label: 'Profiles' },
]

export function ChatPanel({ sessionId }: ChatPanelProps) {
  const [input, setInput] = useState('')
  const [showTools, setShowTools] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { isStreaming, getActiveSession, clearSession } = useChatStore()
  const { sendMessage } = useChat(sessionId)
  const session = getActiveSession()
  const messages = session?.messages ?? []

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, messages[messages.length - 1]?.content])

  // Cmd+K / Ctrl+K to focus input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleSubmit = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return
    setInput('')
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }
    await sendMessage(trimmed)
  }, [input, isStreaming, sendMessage])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
  }

  const handleSuggestionClick = (text: string) => {
    setInput(text)
    inputRef.current?.focus()
  }

  return (
    <div className="flex h-full">
      {/* Chat area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Message thread */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-8 animate-fade-in">
              {/* Hero AI Brain Graphic */}
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-orange-500/20 to-amber-500/10
                                border border-orange-500/30 flex items-center justify-center
                                shadow-glow-orange float">
                  <span className="text-5xl">🧠</span>
                </div>
                {/* Orbiting dots */}
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-500/80
                                border-2 border-dark-950 shadow-glow-sm animate-pulse" />
                <div className="absolute -bottom-1 -left-1 w-3 h-3 rounded-full bg-blue-500/80
                                border-2 border-dark-950 animate-pulse" style={{ animationDelay: '0.5s' }} />
                <div className="absolute top-1/2 -right-3 w-2.5 h-2.5 rounded-full bg-purple-500/80
                                border-2 border-dark-950 animate-pulse" style={{ animationDelay: '1s' }} />
              </div>

              <h2 className="text-2xl font-bold mb-2">
                <span className="gradient-text">Grafana MCP Assistant</span>
              </h2>
              <p className="text-sm text-gray-400 max-w-md leading-relaxed mb-2">
                AI-powered observability. Query metrics, logs, traces, profiles, and alerts
                from your entire Grafana stack using natural language.
              </p>
              <div className="flex items-center gap-4 text-xs text-gray-600 mb-8">
                <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-purple-400" /> Mimir</span>
                <span className="flex items-center gap-1"><AlignLeft className="w-3 h-3 text-yellow-400" /> Loki</span>
                <span className="flex items-center gap-1"><GitBranch className="w-3 h-3 text-cyan-400" /> Tempo</span>
                <span className="flex items-center gap-1"><BarChart2 className="w-3 h-3 text-orange-400" /> Pyroscope</span>
                <span className="flex items-center gap-1"><Search className="w-3 h-3 text-pink-400" /> Faro</span>
              </div>

              {/* Suggestion chips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-w-2xl w-full">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s.text}
                    onClick={() => handleSuggestionClick(s.text)}
                    className="flex items-start gap-2.5 text-left p-3 rounded-xl
                               glass border border-gray-800/60
                               hover:border-orange-500/30 hover:bg-orange-500/5
                               text-xs text-gray-300 hover:text-white
                               transition-all duration-200 group card-hover"
                  >
                    <span className="text-base mt-0.5 flex-shrink-0">{s.icon}</span>
                    <div>
                      <div className="text-gray-500 text-[10px] font-medium uppercase tracking-wide mb-0.5">
                        {s.label}
                      </div>
                      <div className="leading-snug">{s.text}</div>
                    </div>
                  </button>
                ))}
              </div>

              <p className="text-xs text-gray-700 mt-6">
                Press <kbd className="px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-500">⌘K</kbd> to focus input
              </p>
            </div>
          )}

          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div className="flex-shrink-0 p-3 md:p-4"
             style={{ borderTop: '1px solid rgba(55, 65, 81, 0.4)' }}>
          <div className="relative rounded-2xl overflow-hidden"
               style={{
                 background: 'rgba(17, 24, 39, 0.8)',
                 backdropFilter: 'blur(8px)',
                 border: '1px solid rgba(55, 65, 81, 0.5)',
                 transition: 'border-color 0.2s, box-shadow 0.2s',
               }}>

            {/* Streaming indicator bar */}
            {isStreaming && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r
                              from-transparent via-orange-500 to-transparent
                              animate-gradient-shift" />
            )}

            <div className="flex items-end gap-2 p-3">
              {/* AI indicator */}
              <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600
                              flex items-center justify-center mb-0.5 shadow-glow-sm">
                <Cpu className="w-3.5 h-3.5 text-white" />
              </div>

              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="Ask about dashboards, metrics, alerts, logs... (⌘K to focus, Enter to send)"
                rows={1}
                disabled={isStreaming}
                className="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-600
                           resize-none outline-none min-h-[24px] leading-6 disabled:opacity-50
                           py-0.5"
              />

              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Clear */}
                {messages.length > 0 && (
                  <button
                    onClick={() => clearSession(sessionId)}
                    disabled={isStreaming}
                    title="Clear conversation"
                    className="p-1.5 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-gray-700/60
                               disabled:opacity-50 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                {/* MCP tools toggle */}
                <button
                  onClick={() => setShowTools(v => !v)}
                  title="Toggle MCP tools panel"
                  className={`p-1.5 rounded-lg transition-all text-sm font-mono
                    ${showTools
                      ? 'bg-purple-800/60 text-purple-300 border border-purple-700/50'
                      : 'text-gray-600 hover:text-gray-300 hover:bg-gray-700/60'}`}
                >
                  {'{ }'}
                </button>

                {/* Send button */}
                <button
                  onClick={handleSubmit}
                  disabled={!input.trim() || isStreaming}
                  title={isStreaming ? 'Streaming...' : 'Send message'}
                  className="p-1.5 rounded-xl
                             bg-gradient-to-br from-orange-600 to-orange-500
                             hover:from-orange-500 hover:to-amber-500
                             disabled:opacity-40 disabled:cursor-not-allowed
                             text-white transition-all duration-200
                             shadow-glow-sm hover:shadow-glow-orange
                             disabled:shadow-none"
                >
                  {isStreaming
                    ? <Square className="w-4 h-4" />
                    : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-1.5 px-1">
            <p className="text-xs text-gray-700">
              Shift+Enter for new line · ⌘K to focus
            </p>
            {isStreaming && (
              <div className="flex items-center gap-1.5 text-xs text-orange-400">
                <div className="flex gap-0.5">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
                <span>Generating</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MCP Tools sidebar */}
      {showTools && (
        <div className="w-72 flex-shrink-0 border-l border-gray-800/60 animate-slide-in-right">
          <MCPToolsPanel />
        </div>
      )}
    </div>
  )
}
