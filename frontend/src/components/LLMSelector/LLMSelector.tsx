import { useState } from 'react'
import { ChevronDown, Settings2 } from 'lucide-react'
import { useLLMStore } from '@/store/llmStore'
import {
  LLMProviderType,
  PROVIDER_MODELS,
  PROVIDER_DISPLAY_NAMES,
} from '@/types/llm'
import { clsx } from 'clsx'

const PROVIDER_ORDER: LLMProviderType[] = [
  'openai', 'anthropic', 'azure', 'gemini', 'ollama', 'openai_compatible',
]

export function LLMSelector() {
  const [isOpen, setIsOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const { config, setProvider, setModel, setTemperature, setMaxTokens } = useLLMStore()

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(v => !v)}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm
                   bg-gray-800 hover:bg-gray-700 text-gray-200 transition-colors"
      >
        Change LLM
        <ChevronDown className="w-3.5 h-3.5 ml-1" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 w-72 bg-gray-900 border border-gray-700
                     rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in"
        >
          {/* Provider list */}
          {!showSettings ? (
            <>
              <div className="p-3 border-b border-gray-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Select Provider & Model
                </span>
                <button
                  onClick={() => setShowSettings(true)}
                  className="text-gray-500 hover:text-gray-300"
                >
                  <Settings2 className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {PROVIDER_ORDER.map(provider => (
                  <div key={provider}>
                    <div className="px-3 py-1.5 bg-gray-800/50">
                      <span className="text-xs font-medium text-gray-500">
                        {PROVIDER_DISPLAY_NAMES[provider]}
                      </span>
                    </div>
                    {PROVIDER_MODELS[provider].map(model => (
                      <button
                        key={model.id}
                        onClick={() => {
                          setProvider(provider)
                          setModel(model.id)
                          setIsOpen(false)
                        }}
                        className={clsx(
                          'w-full text-left px-4 py-2 text-sm transition-colors',
                          config.provider === provider && config.model === model.id
                            ? 'bg-gray-700 text-white'
                            : 'text-gray-300 hover:bg-gray-800'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span>{model.displayName}</span>
                          {!model.supportsTools && (
                            <span className="text-xs text-yellow-500">no tools</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* Model settings panel */
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">Model Settings</span>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-500 hover:text-gray-300 text-xs"
                >
                  ← Back
                </button>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Temperature: {config.temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={config.temperature}
                  onChange={e => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-orange-500"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-0.5">
                  <span>Precise</span>
                  <span>Creative</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Max Tokens: {config.maxTokens.toLocaleString()}
                </label>
                <input
                  type="range"
                  min="256"
                  max="16384"
                  step="256"
                  value={config.maxTokens}
                  onChange={e => setMaxTokens(parseInt(e.target.value))}
                  className="w-full accent-orange-500"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
