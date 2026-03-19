import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LLMConfig, LLMProviderType } from '@/types/llm'

interface LLMState {
  config: LLMConfig
  setProvider: (provider: LLMProviderType) => void
  setModel: (model: string) => void
  setTemperature: (temp: number) => void
  setMaxTokens: (tokens: number) => void
  setSystemPrompt: (prompt: string) => void
  resetToDefaults: () => void
}

const DEFAULT_CONFIG: LLMConfig = {
  provider: 'openai',
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 4096,
  systemPrompt: undefined,
}

export const useLLMStore = create<LLMState>()(
  persist(
    (set) => ({
      config: DEFAULT_CONFIG,

      setProvider: (provider) =>
        set(state => ({
          config: { ...state.config, provider },
        })),

      setModel: (model) =>
        set(state => ({
          config: { ...state.config, model },
        })),

      setTemperature: (temperature) =>
        set(state => ({
          config: { ...state.config, temperature },
        })),

      setMaxTokens: (maxTokens) =>
        set(state => ({
          config: { ...state.config, maxTokens },
        })),

      setSystemPrompt: (systemPrompt) =>
        set(state => ({
          config: { ...state.config, systemPrompt },
        })),

      resetToDefaults: () => set({ config: DEFAULT_CONFIG }),
    }),
    {
      name: 'llm-config',
      // Only persist provider + model, not session-level settings
      partialize: (state) => ({
        config: {
          provider: state.config.provider,
          model: state.config.model,
          temperature: state.config.temperature,
          maxTokens: state.config.maxTokens,
        },
      }),
    }
  )
)
