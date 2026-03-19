import { useCallback } from 'react'
import { useChatStore } from '@/store/chatStore'
import { useLLMStore } from '@/store/llmStore'
import { useAuthStore } from '@/store/authStore'
import type { StreamEvent } from '@/types/chat'

const CHAT_ENDPOINT = '/api/v1/chat'

export function useChat(sessionId: string) {
  const {
    addMessage,
    appendTextDelta,
    addToolCall,
    updateToolCall,
    updateMessage,
    setStreaming,
  } = useChatStore()
  const { config } = useLLMStore()
  const { getAuthHeaders } = useAuthStore()

  const sendMessage = useCallback(
    async (content: string) => {
      // Add user message
      addMessage(sessionId, { role: 'user', content })

      // Add placeholder assistant message
      const assistantMsgId = addMessage(sessionId, {
        role: 'assistant',
        content: '',
        isStreaming: true,
      })

      setStreaming(true)

      const session = useChatStore.getState().getActiveSession()
      const messages = (session?.messages ?? [])
        .filter(m => !m.isStreaming)
        .map(m => ({ role: m.role, content: m.content }))

      try {
        const response = await fetch(CHAT_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            messages,
            provider: config.provider,
            model: config.model,
            temperature: config.temperature,
            max_tokens: config.maxTokens,
            system_prompt: config.systemPrompt,
            enable_tools: true,
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) throw new Error('No response body')

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const jsonStr = line.slice(6).trim()
            if (!jsonStr) continue

            try {
              const event: StreamEvent = JSON.parse(jsonStr)
              handleStreamEvent(event, sessionId, assistantMsgId)
            } catch {
              // Skip malformed chunks
            }
          }
        }
      } catch (err) {
        updateMessage(sessionId, assistantMsgId, {
          content: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
          isStreaming: false,
        })
      } finally {
        updateMessage(sessionId, assistantMsgId, { isStreaming: false })
        setStreaming(false)
      }
    },
    [sessionId, config, getAuthHeaders, addMessage, appendTextDelta, updateMessage, setStreaming]
  )

  function handleStreamEvent(
    event: StreamEvent,
    sid: string,
    msgId: string
  ) {
    switch (event.type) {
      case 'text_delta':
        if (event.content) appendTextDelta(sid, msgId, event.content)
        break

      case 'tool_call_start':
        if (event.tool) {
          addToolCall(sid, msgId, {
            id: `tc-${Date.now()}`,
            toolName: event.tool,
            arguments: event.args ?? {},
            status: 'running',
          })
        }
        break

      case 'tool_call_result': {
        if (event.tool) {
          const session = useChatStore.getState().getActiveSession()
          const msg = session?.messages.find(m => m.id === msgId)
          const tc = msg?.toolCalls?.find(
            t => t.toolName === event.tool && t.status === 'running'
          )
          if (tc) {
            updateToolCall(sid, msgId, tc.id, {
              result: event.result,
              status: (event.result as any)?.success === false ? 'error' : 'success',
            })
          }
        }
        break
      }

      case 'done':
        // Final event — nothing to do, isStreaming cleared in finally
        break

      case 'error':
        updateMessage(sid, msgId, {
          content: `Error: ${event.message ?? 'Unknown error'}`,
        })
        break
    }
  }

  return { sendMessage }
}
