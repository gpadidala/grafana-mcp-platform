import { useEffect, useRef, useState, useCallback } from 'react'
import { Send, Square, Trash2 } from 'lucide-react'
import { MessageBubble } from './MessageBubble'
import { MCPToolsPanel } from '@/components/MCPToolsPanel/MCPToolsPanel'
import { useChatStore } from '@/store/chatStore'
import { useChat } from '@/hooks/useChat'

interface ChatPanelProps {
  sessionId: string
}

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

  return (
    <div className="flex h-full">
      {/* Chat area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Message thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="w-12 h-12 bg-orange-600/20 rounded-2xl flex items-center justify-center mb-4">
                <span className="text-2xl">🔍</span>
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">
                Grafana MCP Assistant
              </h2>
              <p className="text-sm text-gray-500 max-w-sm">
                Ask me anything about your Grafana dashboards, metrics, logs, alerts,
                or traces. I'll use the MCP tools to pull real data.
              </p>
              <div className="grid grid-cols-2 gap-2 mt-6 max-w-sm w-full">
                {[
                  'What dashboards are showing errors?',
                  'Show me active firing alerts',
                  'What\'s the error rate on the API service?',
                  'Search for dashboards tagged "production"',
                ].map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => { setInput(suggestion); inputRef.current?.focus() }}
                    className="text-left px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700
                               text-xs text-gray-300 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div className="border-t border-gray-800 p-4">
          <div className="flex items-end gap-2 bg-gray-800 rounded-xl p-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask about dashboards, metrics, alerts... (⌘K to focus, Enter to send)"
              rows={1}
              disabled={isStreaming}
              className="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-500
                         resize-none outline-none min-h-[24px] leading-6 disabled:opacity-50"
            />
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Clear */}
              {messages.length > 0 && (
                <button
                  onClick={() => clearSession(sessionId)}
                  disabled={isStreaming}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-700
                             disabled:opacity-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              {/* MCP tools toggle */}
              <button
                onClick={() => setShowTools(v => !v)}
                className={`p-1.5 rounded-lg transition-colors text-sm font-mono
                  ${showTools
                    ? 'bg-purple-800 text-purple-200'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'}`}
              >
                {'{ }'}
              </button>
              {/* Send */}
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || isStreaming}
                className="p-1.5 rounded-lg bg-orange-600 hover:bg-orange-500
                           disabled:opacity-40 disabled:cursor-not-allowed text-white
                           transition-colors"
              >
                {isStreaming
                  ? <Square className="w-4 h-4" />
                  : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-1.5 px-1">
            Shift+Enter for new line · ⌘K to focus
          </p>
        </div>
      </div>

      {/* MCP Tools sidebar */}
      {showTools && (
        <div className="w-72 flex-shrink-0 border-l border-gray-800">
          <MCPToolsPanel />
        </div>
      )}
    </div>
  )
}
