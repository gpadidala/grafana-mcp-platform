export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'

export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
  toolCalls?: ToolCallInfo[]
  isStreaming?: boolean
}

export interface ToolCallInfo {
  id: string
  toolName: string
  arguments: Record<string, unknown>
  result?: unknown
  error?: string
  durationMs?: number
  status: 'pending' | 'running' | 'success' | 'error'
}

export type StreamEventType =
  | 'text_delta'
  | 'tool_call_start'
  | 'tool_call_result'
  | 'done'
  | 'error'

export interface StreamEvent {
  type: StreamEventType
  content?: string
  tool?: string
  args?: Record<string, unknown>
  result?: unknown
  message?: string
  usage?: { input_tokens: number; output_tokens: number }
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
  provider: string
  model: string
}
