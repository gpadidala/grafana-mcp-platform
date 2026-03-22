import { useState } from 'react'
import { Check, ExternalLink, ChevronRight, Cpu, Wrench, Palette } from 'lucide-react'
import { useLLMStore } from '@/store/llmStore'
import { PROVIDER_DISPLAY_NAMES, type LLMProviderType } from '@/types/llm'
import { Badge } from '@/components/ui/Badge'
import { StatusDot } from '@/components/ui/StatusDot'
import { cn } from '@/lib/utils'

type Tab = 'llm' | 'mcp' | 'appearance'

const TABS: { id: Tab; label: string; icon: typeof Cpu }[] = [
  { id: 'llm', label: 'LLM Providers', icon: Cpu },
  { id: 'mcp', label: 'MCP Server', icon: Wrench },
  { id: 'appearance', label: 'Appearance', icon: Palette },
]

const PROVIDERS: { id: LLMProviderType; name: string; description: string; color: string }[] = [
  { id: 'openai', name: 'OpenAI', description: 'GPT-4o, GPT-4o Mini', color: '#73bf69' },
  { id: 'anthropic', name: 'Anthropic', description: 'Claude Sonnet, Claude Opus', color: '#fb923c' },
  { id: 'azure', name: 'Azure OpenAI', description: 'Azure-hosted GPT-4o', color: '#5794f2' },
  { id: 'gemini', name: 'Google Gemini', description: 'Gemini 1.5 Pro, Flash', color: '#9d6fd4' },
  { id: 'ollama', name: 'Ollama (Local)', description: 'Llama 3, Mistral, CodeLlama', color: '#9fa7b3' },
  { id: 'openai_compatible', name: 'Custom / OpenAI-Compatible', description: 'Any OpenAI-compatible endpoint', color: '#22D3EE' },
]

function LLMTab() {
  const { config } = useLLMStore()
  const [configured] = useState<Set<LLMProviderType>>(new Set([config.provider]))

  return (
    <div className="space-y-3 max-w-2xl">
      <p className="text-sm text-text-secondary mb-5">
        Configure which AI providers GrafanaAI can use. API keys are stored in memory only and never persisted to disk.
      </p>

      {PROVIDERS.map((p) => {
        const isActive = p.id === config.provider
        const isConfigured = configured.has(p.id)

        return (
          <div
            key={p.id}
            className="flex items-center gap-4 rounded-xl px-4 py-3.5 transition-all duration-150"
            style={{
              background: isActive ? 'rgba(61,157,243,0.06)' : 'var(--color-bg-secondary)',
              border: `1px solid ${isActive ? 'rgba(61,157,243,0.3)' : 'var(--color-border-weak)'}`,
            }}
          >
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-text-primary">{p.name}</span>
                {isActive && <Badge variant="ai">Active</Badge>}
                {isConfigured && !isActive && <Badge variant="success">Configured</Badge>}
              </div>
              <p className="text-xs text-text-disabled mt-0.5">{p.description}</p>
            </div>

            <button
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 flex-shrink-0',
                isConfigured ? 'btn-ghost' : 'btn-ai'
              )}
            >
              {isConfigured ? 'Configure' : 'Connect'}
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

function MCPTab() {
  const [mcpUrl, setMcpUrl] = useState('http://localhost:8001')
  const [connected] = useState(true)

  return (
    <div className="max-w-2xl space-y-5">
      <p className="text-sm text-text-secondary">
        Configure the MCP (Model Context Protocol) server that provides tools to the AI agent.
      </p>

      <div>
        <label className="block text-xs font-semibold text-text-secondary mb-2">Server URL</label>
        <div className="flex items-center gap-2">
          <input
            value={mcpUrl}
            onChange={(e) => setMcpUrl(e.target.value)}
            className="input text-sm flex-1"
            placeholder="http://localhost:8001"
          />
          <button className="btn-ai text-xs px-3 py-2 rounded-lg flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" />
            Test
          </button>
        </div>
      </div>

      <div
        className="rounded-xl px-4 py-3 flex items-center gap-3"
        style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-weak)' }}
      >
        <StatusDot color={connected ? 'green' : 'red'} pulse={connected} />
        <div>
          <div className="text-sm font-medium text-text-primary">{connected ? 'Connected' : 'Disconnected'}</div>
          <div className="text-xs text-text-disabled">{mcpUrl}</div>
        </div>
        <button className="ml-auto btn-ghost text-xs px-2.5 py-1.5 flex items-center gap-1.5">
          <ExternalLink className="w-3.5 h-3.5" />
          Open Docs
        </button>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-3">Available Tools</h3>
        <div className="space-y-2">
          {[
            'grafana_search_dashboards', 'grafana_get_datasources', 'grafana_get_alerts',
            'mimir_query', 'loki_query', 'tempo_search', 'pyroscope_query', 'faro_vitals',
          ].map((tool) => (
            <div
              key={tool}
              className="flex items-center justify-between px-3 py-2 rounded-lg"
              style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-weak)' }}
            >
              <div className="flex items-center gap-2.5">
                <StatusDot color="green" size="sm" />
                <span className="text-xs font-mono text-ai">{tool}</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-9 h-5 rounded-full peer bg-grafana-overlay peer-checked:bg-ai/70 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AppearanceTab() {
  return (
    <div className="max-w-md space-y-5">
      <div>
        <label className="block text-xs font-semibold text-text-secondary mb-2">Theme</label>
        <div className="flex items-center gap-2">
          {['Dark', 'System'].map((t) => (
            <button
              key={t}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors border',
                t === 'Dark'
                  ? 'bg-grafana-elevated border-border-medium text-text-primary'
                  : 'border-border-weak text-text-disabled hover:text-text-secondary'
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-text-secondary mb-2">Sidebar Default</label>
        <select className="input text-sm w-full">
          <option>Expanded</option>
          <option>Collapsed</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-text-secondary mb-2">Font Size</label>
        <select className="input text-sm w-full">
          <option>Small (12px)</option>
          <option>Medium (14px)</option>
          <option>Large (16px)</option>
        </select>
      </div>

      <div className="pt-4">
        <h3 className="text-sm font-semibold text-text-primary mb-3">System Info</h3>
        <div className="space-y-1.5 text-xs">
          {[
            ['Version', '2.0.0'],
            ['Build', 'production'],
            ['Provider', PROVIDER_DISPLAY_NAMES['openai']],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-1.5 border-b border-border-weak">
              <span className="text-text-disabled">{k}</span>
              <span className="font-mono text-text-secondary">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>('llm')

  return (
    <div className="flex h-full overflow-hidden">
      <div
        className="w-48 flex-shrink-0 pt-6 px-3 space-y-1"
        style={{ borderRight: '1px solid var(--color-border-weak)' }}
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              tab === id
                ? 'bg-grafana-elevated text-text-primary border border-border-medium'
                : 'text-text-disabled hover:text-text-secondary hover:bg-grafana-elevated'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-8">
        <h2 className="text-xl font-bold text-white mb-1">
          {TABS.find((t) => t.id === tab)?.label}
        </h2>
        <div className="mt-6">
          {tab === 'llm' && <LLMTab />}
          {tab === 'mcp' && <MCPTab />}
          {tab === 'appearance' && <AppearanceTab />}
        </div>
      </div>
    </div>
  )
}
