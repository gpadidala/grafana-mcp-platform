import { useEffect } from 'react'
import { useChatStore } from '@/store/chatStore'
import { useLLMStore } from '@/store/llmStore'
import { useAuthStore } from '@/store/authStore'
import { useChat } from '@/hooks/useChat'
import { MessageThread } from '@/components/chat/MessageThread'
import { ChatInput } from '@/components/chat/ChatInput'
import { SuggestedPrompts } from '@/components/chat/SuggestedPrompts'
import { useQuery } from '@tanstack/react-query'
import { mcpApi } from '@/services/api'

function ChatSession({ sessionId }: { sessionId: string }) {
  const { sessions, isStreaming } = useChatStore()
  const { config } = useLLMStore()
  const { sendMessage } = useChat(sessionId)

  const session = sessions.find((s) => s.id === sessionId)
  const messages = session?.messages ?? []
  const hasMessages = messages.length > 0

  const { data: toolsData } = useQuery({
    queryKey: ['mcp-tools'],
    queryFn: () => mcpApi.listTools().then((r) => r.data),
    retry: 1,
  })
  const toolCount = Array.isArray(toolsData) ? (toolsData as unknown[]).length : 0

  return (
    <div className="flex flex-col h-full">
      {hasMessages ? (
        <MessageThread messages={messages} model={config.model} />
      ) : (
        <SuggestedPrompts onSelect={sendMessage} />
      )}
      <ChatInput
        onSend={sendMessage}
        isStreaming={isStreaming}
        toolCount={toolCount}
      />
    </div>
  )
}

export function ChatPage() {
  const { sessions, activeSessionId, createSession, setActiveSession } = useChatStore()
  const { config } = useLLMStore()
  const { setApiKey, isAuthenticated } = useAuthStore()

  // Auto-auth
  useEffect(() => {
    const apiKey = import.meta.env.VITE_API_KEY
    if (apiKey && !isAuthenticated) {
      setApiKey(apiKey as string)
    }
  }, [isAuthenticated, setApiKey])

  // Auto-create session
  useEffect(() => {
    if (sessions.length === 0) {
      createSession(config.provider, config.model)
    } else if (!activeSessionId) {
      setActiveSession(sessions[0].id)
    }
  }, [sessions.length, activeSessionId, config.provider, config.model, createSession, setActiveSession, sessions])

  const effectiveSessionId = activeSessionId ?? sessions[0]?.id

  if (!effectiveSessionId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'rgba(61,157,243,0.3)', borderTopColor: 'var(--color-ai)' }}
          />
          <span className="text-sm text-text-disabled">Initializing...</span>
        </div>
      </div>
    )
  }

  return <ChatSession sessionId={effectiveSessionId} />
}
