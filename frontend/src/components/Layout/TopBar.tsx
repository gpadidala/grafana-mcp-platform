import { Menu } from 'lucide-react'
import { LLMSelector } from '@/components/LLMSelector/LLMSelector'
import { useLLMStore } from '@/store/llmStore'
import { PROVIDER_COLORS, PROVIDER_DISPLAY_NAMES } from '@/types/llm'

interface TopBarProps {
  onToggleSidebar: () => void
}

export function TopBar({ onToggleSidebar }: TopBarProps) {
  const { config } = useLLMStore()

  return (
    <header className="h-14 flex items-center justify-between px-4
                        bg-gray-900 border-b border-gray-800 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-sm text-gray-400">
          Grafana MCP Platform
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Active provider badge */}
        <span className={`px-2 py-1 rounded text-xs font-medium text-white
                          ${PROVIDER_COLORS[config.provider]}`}>
          {PROVIDER_DISPLAY_NAMES[config.provider]}
        </span>
        <span className="text-xs text-gray-500">{config.model}</span>

        {/* LLM Selector dropdown */}
        <LLMSelector />
      </div>
    </header>
  )
}
