import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { v4 as uuidv4 } from 'crypto'
import type { ChatSession, Message, ToolCallInfo } from '@/types/chat'

function newSessionId(): string {
  return Math.random().toString(36).slice(2, 10)
}

interface ChatState {
  sessions: ChatSession[]
  activeSessionId: string | null
  isStreaming: boolean

  // Actions
  createSession: (provider: string, model: string) => string
  setActiveSession: (id: string) => void
  addMessage: (sessionId: string, message: Omit<Message, 'id' | 'timestamp'>) => string
  updateMessage: (sessionId: string, messageId: string, patch: Partial<Message>) => void
  appendTextDelta: (sessionId: string, messageId: string, delta: string) => void
  addToolCall: (sessionId: string, messageId: string, toolCall: ToolCallInfo) => void
  updateToolCall: (sessionId: string, messageId: string, toolCallId: string, patch: Partial<ToolCallInfo>) => void
  setStreaming: (streaming: boolean) => void
  clearSession: (sessionId: string) => void
  deleteSession: (sessionId: string) => void
  getActiveSession: () => ChatSession | undefined
}

export const useChatStore = create<ChatState>()(
  devtools(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,
      isStreaming: false,

      createSession: (provider, model) => {
        const id = newSessionId()
        const session: ChatSession = {
          id,
          title: 'New conversation',
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          provider,
          model,
        }
        set(state => ({
          sessions: [session, ...state.sessions],
          activeSessionId: id,
        }))
        return id
      },

      setActiveSession: (id) => set({ activeSessionId: id }),

      addMessage: (sessionId, message) => {
        const messageId = newSessionId()
        const fullMessage: Message = {
          id: messageId,
          timestamp: new Date(),
          ...message,
        }
        set(state => ({
          sessions: state.sessions.map(s =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: [...s.messages, fullMessage],
                  updatedAt: new Date(),
                  title: s.messages.length === 0 && message.role === 'user'
                    ? message.content.slice(0, 50)
                    : s.title,
                }
              : s
          ),
        }))
        return messageId
      },

      updateMessage: (sessionId, messageId, patch) => {
        set(state => ({
          sessions: state.sessions.map(s =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: s.messages.map(m =>
                    m.id === messageId ? { ...m, ...patch } : m
                  ),
                }
              : s
          ),
        }))
      },

      appendTextDelta: (sessionId, messageId, delta) => {
        set(state => ({
          sessions: state.sessions.map(s =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: s.messages.map(m =>
                    m.id === messageId ? { ...m, content: m.content + delta } : m
                  ),
                }
              : s
          ),
        }))
      },

      addToolCall: (sessionId, messageId, toolCall) => {
        set(state => ({
          sessions: state.sessions.map(s =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: s.messages.map(m =>
                    m.id === messageId
                      ? { ...m, toolCalls: [...(m.toolCalls ?? []), toolCall] }
                      : m
                  ),
                }
              : s
          ),
        }))
      },

      updateToolCall: (sessionId, messageId, toolCallId, patch) => {
        set(state => ({
          sessions: state.sessions.map(s =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: s.messages.map(m =>
                    m.id === messageId
                      ? {
                          ...m,
                          toolCalls: (m.toolCalls ?? []).map(tc =>
                            tc.id === toolCallId ? { ...tc, ...patch } : tc
                          ),
                        }
                      : m
                  ),
                }
              : s
          ),
        }))
      },

      setStreaming: (streaming) => set({ isStreaming: streaming }),

      clearSession: (sessionId) => {
        set(state => ({
          sessions: state.sessions.map(s =>
            s.id === sessionId ? { ...s, messages: [], updatedAt: new Date() } : s
          ),
        }))
      },

      deleteSession: (sessionId) => {
        set(state => {
          const remaining = state.sessions.filter(s => s.id !== sessionId)
          return {
            sessions: remaining,
            activeSessionId:
              state.activeSessionId === sessionId
                ? remaining[0]?.id ?? null
                : state.activeSessionId,
          }
        })
      },

      getActiveSession: () => {
        const state = get()
        return state.sessions.find(s => s.id === state.activeSessionId)
      },
    }),
    { name: 'chat-store' }
  )
)
