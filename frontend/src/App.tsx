import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from '@/components/Layout/AppShell'
import { ChatPanel } from '@/components/ChatPanel/ChatPanel'
import { useChatStore } from '@/store/chatStore'
import { useAuthStore } from '@/store/authStore'
import { useLLMStore } from '@/store/llmStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function ChatApp() {
  const { sessions, activeSessionId, createSession, setActiveSession } = useChatStore()
  const { config } = useLLMStore()
  const { setApiKey, isAuthenticated } = useAuthStore()

  // Auto-auth with env API key for local dev
  useEffect(() => {
    const apiKey = import.meta.env.VITE_API_KEY
    if (apiKey && !isAuthenticated) {
      setApiKey(apiKey)
    }
  }, [isAuthenticated, setApiKey])

  // Auto-create first session
  useEffect(() => {
    if (sessions.length === 0) {
      createSession(config.provider, config.model)
    } else if (!activeSessionId) {
      setActiveSession(sessions[0].id)
    }
  }, [sessions.length, activeSessionId, config.provider, config.model,
      createSession, setActiveSession, sessions])

  const effectiveSessionId = activeSessionId ?? sessions[0]?.id

  return (
    <AppShell>
      {effectiveSessionId ? (
        <ChatPanel sessionId={effectiveSessionId} />
      ) : (
        <div className="flex items-center justify-center h-full text-gray-500">
          Loading...
        </div>
      )}
    </AppShell>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="dark">
        <ChatApp />
      </div>
    </QueryClientProvider>
  )
}
