import { RefreshCw, Wrench, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useMCPTools } from '@/hooks/useMCPTools'
import type { MCPTool } from '@/types/mcp'
import { clsx } from 'clsx'

function ToolRow({ tool }: { tool: MCPTool }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border-b border-gray-800 last:border-0">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-800/50 text-left"
      >
        <Wrench className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
        <span className="flex-1 text-xs font-mono text-purple-300 truncate">
          {tool.name}
        </span>
        {expanded
          ? <ChevronDown className="w-3.5 h-3.5 text-gray-600" />
          : <ChevronRight className="w-3.5 h-3.5 text-gray-600" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          <p className="text-xs text-gray-400">{tool.description}</p>
          {Object.keys(tool.input_schema.properties).length > 0 && (
            <div>
              <span className="text-xs text-gray-600 uppercase tracking-wide">Parameters</span>
              <div className="mt-1 space-y-1">
                {Object.entries(tool.input_schema.properties).map(([key, schema]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-xs font-mono text-cyan-400">{key}</span>
                    <span className="text-xs text-gray-600">
                      {(schema as any).type}
                    </span>
                    {tool.input_schema.required?.includes(key) && (
                      <span className="text-xs text-red-500">required</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function MCPToolsPanel() {
  const { tools, isLoading, refresh } = useMCPTools()

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="flex items-center justify-between p-3 border-b border-gray-800">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          MCP Tools ({tools.length})
        </span>
        <button
          onClick={() => refresh()}
          disabled={isLoading}
          className="p-1 rounded text-gray-500 hover:text-gray-300 disabled:opacity-50"
        >
          <RefreshCw className={clsx('w-3.5 h-3.5', isLoading && 'animate-spin')} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="p-4 text-center text-xs text-gray-500">
            Loading tools...
          </div>
        )}
        {!isLoading && tools.length === 0 && (
          <div className="p-4 text-center text-xs text-gray-500">
            No tools available. Is the MCP server running?
          </div>
        )}
        {tools.map(tool => (
          <ToolRow key={tool.name} tool={tool} />
        ))}
      </div>
    </div>
  )
}
