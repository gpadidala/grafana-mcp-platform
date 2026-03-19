export type LLMProviderType =
  | 'openai'
  | 'anthropic'
  | 'azure'
  | 'gemini'
  | 'ollama'
  | 'openai_compatible'

export interface LLMModel {
  id: string
  displayName: string
  provider: LLMProviderType
  maxTokens: number
  supportsTools: boolean
  supportsStreaming: boolean
}

export interface LLMConfig {
  provider: LLMProviderType
  model: string
  temperature: number
  maxTokens: number
  systemPrompt?: string
}

export const PROVIDER_MODELS: Record<LLMProviderType, LLMModel[]> = {
  openai: [
    { id: 'gpt-4o', displayName: 'GPT-4o', provider: 'openai', maxTokens: 128000, supportsTools: true, supportsStreaming: true },
    { id: 'gpt-4o-mini', displayName: 'GPT-4o Mini', provider: 'openai', maxTokens: 128000, supportsTools: true, supportsStreaming: true },
    { id: 'gpt-4-turbo', displayName: 'GPT-4 Turbo', provider: 'openai', maxTokens: 128000, supportsTools: true, supportsStreaming: true },
  ],
  anthropic: [
    { id: 'claude-opus-4-6', displayName: 'Claude Opus 4.6', provider: 'anthropic', maxTokens: 200000, supportsTools: true, supportsStreaming: true },
    { id: 'claude-sonnet-4-6', displayName: 'Claude Sonnet 4.6', provider: 'anthropic', maxTokens: 200000, supportsTools: true, supportsStreaming: true },
    { id: 'claude-haiku-4-5-20251001', displayName: 'Claude Haiku 4.5', provider: 'anthropic', maxTokens: 200000, supportsTools: true, supportsStreaming: true },
  ],
  azure: [
    { id: 'gpt-4o', displayName: 'Azure GPT-4o', provider: 'azure', maxTokens: 128000, supportsTools: true, supportsStreaming: true },
  ],
  gemini: [
    { id: 'gemini-1.5-pro', displayName: 'Gemini 1.5 Pro', provider: 'gemini', maxTokens: 1000000, supportsTools: true, supportsStreaming: true },
    { id: 'gemini-1.5-flash', displayName: 'Gemini 1.5 Flash', provider: 'gemini', maxTokens: 1000000, supportsTools: true, supportsStreaming: true },
  ],
  ollama: [
    { id: 'llama3.1', displayName: 'Llama 3.1', provider: 'ollama', maxTokens: 128000, supportsTools: false, supportsStreaming: true },
    { id: 'mistral', displayName: 'Mistral', provider: 'ollama', maxTokens: 32000, supportsTools: false, supportsStreaming: true },
    { id: 'codellama', displayName: 'Code Llama', provider: 'ollama', maxTokens: 16000, supportsTools: false, supportsStreaming: true },
  ],
  openai_compatible: [
    { id: 'custom', displayName: 'Custom Model', provider: 'openai_compatible', maxTokens: 32000, supportsTools: true, supportsStreaming: true },
  ],
}

export const PROVIDER_DISPLAY_NAMES: Record<LLMProviderType, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  azure: 'Azure OpenAI',
  gemini: 'Google Gemini',
  ollama: 'Ollama (Local)',
  openai_compatible: 'OpenAI-Compatible',
}

export const PROVIDER_COLORS: Record<LLMProviderType, string> = {
  openai: 'bg-green-600',
  anthropic: 'bg-orange-600',
  azure: 'bg-blue-600',
  gemini: 'bg-purple-600',
  ollama: 'bg-gray-600',
  openai_compatible: 'bg-cyan-600',
}
