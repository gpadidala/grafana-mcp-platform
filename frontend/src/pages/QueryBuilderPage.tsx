import { useState } from 'react'
import { Play, Sparkles, BookOpen, Zap, Save, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react'
import SyntaxHighlighter from 'react-syntax-highlighter'
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'
import { queriesApi } from '@/services/api'

type Lang = 'PromQL' | 'LogQL' | 'TraceQL' | 'SQL'

const EXAMPLES: Record<Lang, string> = {
  PromQL: `# Error rate for checkout service
rate(http_requests_total{app="checkout",status=~"5.."}[5m])

# P99 latency
histogram_quantile(0.99,
  rate(http_request_duration_seconds_bucket{app="checkout"}[5m])
)`,
  LogQL: `# Error logs for checkout service
{app="checkout"} |~ "ERROR|FATAL|panic"
  | json
  | line_format "{{.msg}}"`,
  TraceQL: `# Slow traces > 2s for checkout
{.service.name = "checkout"
  && duration > 2s}`,
  SQL: `-- Recent incidents
SELECT title, severity, status, created_at
FROM incidents
WHERE status = 'open'
ORDER BY created_at DESC
LIMIT 20`,
}

const LANG_MAP: Record<Lang, string> = {
  PromQL: 'promql',
  LogQL: 'logql',
  TraceQL: 'traceql',
  SQL: 'sql',
}

interface ValidationResult {
  valid: boolean
  errors?: string[]
  suggestions?: string[]
}

interface ExplainResult {
  explanation: string
  components?: Array<{ part: string; description: string }>
}

export function QueryBuilderPage() {
  const [lang, setLang] = useState<Lang>('PromQL')
  const [query, setQuery] = useState(EXAMPLES.PromQL)
  const [nlQuery, setNlQuery] = useState('')
  const [running, setRunning] = useState(false)
  const [explaining, setExplaining] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [explanation, setExplanation] = useState<ExplainResult | null>(null)
  const [activePanel, setActivePanel] = useState<'results' | 'explain'>('results')

  const handleLangChange = (l: Lang) => {
    setLang(l)
    setQuery(EXAMPLES[l])
    setValidation(null)
    setExplanation(null)
  }

  const handleRun = async () => {
    setRunning(true)
    setValidation(null)
    setActivePanel('results')
    try {
      const res = await queriesApi.validate(query, LANG_MAP[lang])
      setValidation(res.data as ValidationResult)
    } catch {
      setValidation({ valid: false, errors: ['Failed to validate query — check backend connection'] })
    } finally {
      setRunning(false)
    }
  }

  const handleExplain = async () => {
    setExplaining(true)
    setExplanation(null)
    setActivePanel('explain')
    try {
      const res = await queriesApi.explain(query, LANG_MAP[lang])
      setExplanation(res.data as ExplainResult)
    } catch {
      setExplanation({ explanation: 'Failed to explain query — check backend connection' })
    } finally {
      setExplaining(false)
    }
  }

  const handleGenerate = async () => {
    if (!nlQuery.trim()) return
    setGenerating(true)
    try {
      const res = await queriesApi.explain(nlQuery, LANG_MAP[lang])
      const data = res.data as { generated_query?: string; explanation?: string }
      if (data.generated_query) {
        setQuery(data.generated_query)
      }
    } catch {
      // silently fail — query input stays as is
    } finally {
      setGenerating(false)
    }
  }

  const LANGS: Lang[] = ['PromQL', 'LogQL', 'TraceQL', 'SQL']

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="flex-shrink-0 px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--color-border-weak)' }}
      >
        <div>
          <h1 className="text-lg font-bold text-white">Query Builder</h1>
          <p className="text-sm text-text-secondary mt-0.5">Write and run observability queries with AI assistance</p>
        </div>
      </div>

      {/* Lang tabs */}
      <div
        className="flex-shrink-0 px-6 flex items-center gap-1"
        style={{ borderBottom: '1px solid var(--color-border-weak)' }}
      >
        {LANGS.map((l) => (
          <button
            key={l}
            onClick={() => handleLangChange(l)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
              lang === l
                ? 'text-text-primary border-orange-brand'
                : 'text-text-disabled border-transparent hover:text-text-secondary'
            )}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Body: editor + results */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left: editor */}
        <div
          className="flex-1 flex flex-col min-w-0"
          style={{ borderRight: '1px solid var(--color-border-weak)' }}
        >
          {/* NL input */}
          <div className="flex-shrink-0 px-4 py-3" style={{ borderBottom: '1px solid var(--color-border-weak)' }}>
            <div className="flex items-center gap-2">
              <input
                value={nlQuery}
                onChange={(e) => setNlQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && nlQuery.trim()) void handleGenerate() }}
                placeholder={`Describe your ${lang} query in plain English...`}
                className="input text-sm flex-1"
              />
              <button
                onClick={() => void handleGenerate()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium btn-ai flex-shrink-0"
                disabled={!nlQuery.trim() || generating}
              >
                <Sparkles className="w-3.5 h-3.5" />
                {generating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>

          {/* Query editor */}
          <div className="flex-1 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none overflow-auto" style={{ zIndex: 1 }}>
              <SyntaxHighlighter
                language={lang === 'PromQL' || lang === 'LogQL' ? 'bash' : lang === 'SQL' ? 'sql' : 'text'}
                style={atomOneDark}
                customStyle={{
                  margin: 0,
                  background: 'transparent',
                  fontSize: '12px',
                  lineHeight: '1.7',
                  padding: '16px',
                  minHeight: '100%',
                }}
              >
                {query}
              </SyntaxHighlighter>
            </div>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="absolute inset-0 w-full h-full resize-none outline-none px-4 py-4 text-xs font-mono"
              style={{
                background: 'transparent',
                color: 'transparent',
                caretColor: 'var(--color-ai)',
                zIndex: 3,
                lineHeight: '1.7',
              }}
              spellCheck={false}
            />
          </div>

          {/* Toolbar */}
          <div
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5"
            style={{ borderTop: '1px solid var(--color-border-weak)', background: 'var(--color-bg-primary)' }}
          >
            <button
              onClick={() => void handleRun()}
              disabled={running}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium btn-primary"
            >
              <Play className="w-3.5 h-3.5" />
              {running ? 'Validating...' : 'Validate'}
            </button>
            <button
              onClick={() => void handleExplain()}
              disabled={explaining}
              className="btn-ghost text-xs px-2.5 py-1.5 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {explaining ? 'Explaining...' : 'Explain'}
            </button>
            <button className="btn-ghost text-xs px-2.5 py-1.5 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Optimize
            </button>
            <button className="btn-ghost text-xs px-2.5 py-1.5 flex items-center gap-1.5">
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
            <button className="btn-ghost text-xs px-2.5 py-1.5 flex items-center gap-1.5 ml-auto">
              <ExternalLink className="w-3.5 h-3.5" />
              Open in Grafana
            </button>
          </div>
        </div>

        {/* Right: results/explain */}
        <div className="w-[45%] flex flex-col overflow-hidden">
          <div
            className="flex-shrink-0 flex items-center gap-1 px-4"
            style={{ borderBottom: '1px solid var(--color-border-weak)', background: 'var(--color-bg-primary)' }}
          >
            <button
              onClick={() => setActivePanel('results')}
              className={cn(
                'px-3 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5',
                activePanel === 'results'
                  ? 'text-text-primary border-orange-brand'
                  : 'text-text-disabled border-transparent hover:text-text-secondary'
              )}
            >
              <BookOpen className="w-3 h-3" />
              Validation
            </button>
            <button
              onClick={() => setActivePanel('explain')}
              className={cn(
                'px-3 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5',
                activePanel === 'explain'
                  ? 'text-text-primary border-orange-brand'
                  : 'text-text-disabled border-transparent hover:text-text-secondary'
              )}
            >
              <Sparkles className="w-3 h-3" />
              AI Explanation
            </button>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
            {activePanel === 'results' ? (
              running ? (
                <div className="space-y-3">
                  <Skeleton height={60} />
                  <Skeleton height={40} />
                </div>
              ) : validation ? (
                <div className="space-y-3">
                  <div className={cn(
                    'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium',
                    validation.valid
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  )}>
                    {validation.valid
                      ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                    {validation.valid ? 'Query is valid' : 'Query has errors'}
                  </div>
                  {validation.errors && validation.errors.length > 0 && (
                    <div className="space-y-1.5">
                      {validation.errors.map((err, i) => (
                        <div key={i} className="text-xs text-red-400 px-3 py-2 rounded-md"
                          style={{ background: 'var(--color-bg-overlay)' }}>
                          {err}
                        </div>
                      ))}
                    </div>
                  )}
                  {validation.suggestions && validation.suggestions.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-text-disabled px-1">Suggestions</div>
                      {validation.suggestions.map((s, i) => (
                        <div key={i} className="text-xs text-text-secondary px-3 py-2 rounded-md"
                          style={{ background: 'var(--color-bg-overlay)' }}>
                          {s}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Play className="w-8 h-8 mb-3 text-text-disabled" />
                  <p className="text-sm text-text-disabled">Click Validate to check your query</p>
                </div>
              )
            ) : (
              explaining ? (
                <div className="space-y-3">
                  <Skeleton height={80} />
                  <Skeleton height={120} />
                </div>
              ) : explanation ? (
                <div className="space-y-4">
                  <p className="text-sm text-text-secondary leading-relaxed">{explanation.explanation}</p>
                  {explanation.components && explanation.components.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-text-disabled">Components</div>
                      {explanation.components.map((c, i) => (
                        <div key={i} className="rounded-lg p-3" style={{ background: 'var(--color-bg-overlay)', border: '1px solid var(--color-border-weak)' }}>
                          <div className="text-xs font-mono text-ai mb-1">{c.part}</div>
                          <div className="text-xs text-text-disabled">{c.description}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Sparkles className="w-8 h-8 mb-3 text-text-disabled" />
                  <p className="text-sm text-text-disabled">Click Explain for an AI breakdown</p>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
