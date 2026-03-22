import { useState } from 'react'
import { Rocket, Clock, Check, X, Loader, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { useInvestigation, type InvestigationStep, type InvestigationFinding } from '@/hooks/useInvestigation'

function StepTimeline({ steps }: { steps: InvestigationStep[] }) {
  return (
    <div className="space-y-2">
      {steps.map((step, idx) => (
        <div key={step.id} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300',
              step.status === 'pending' && 'border border-border-medium bg-grafana-elevated',
              step.status === 'running' && 'border border-ai bg-ai-muted',
              step.status === 'done' && 'bg-status-success/15 border border-status-success/30',
              step.status === 'failed' && 'bg-status-error/15 border border-status-error/30',
            )}>
              {step.status === 'pending' && <Clock className="w-3.5 h-3.5 text-text-disabled" />}
              {step.status === 'running' && <Loader className="w-3.5 h-3.5 text-ai animate-spin" />}
              {step.status === 'done' && <Check className="w-3.5 h-3.5 text-status-success" />}
              {step.status === 'failed' && <X className="w-3.5 h-3.5 text-status-error" />}
            </div>
            {idx < steps.length - 1 && (
              <div className={cn(
                'w-px flex-1 min-h-[16px] mt-1',
                step.status === 'done' ? 'bg-status-success/30' : 'bg-border-weak'
              )} />
            )}
          </div>

          <div className="flex-1 min-w-0 pb-3">
            <div className="flex items-center justify-between gap-2">
              <span className={cn(
                'text-sm font-medium',
                step.status === 'pending' ? 'text-text-disabled' : 'text-text-primary'
              )}>
                {step.label}
              </span>
              {step.duration_ms !== undefined && (
                <span className="text-[11px] text-text-disabled flex-shrink-0">{Math.round(step.duration_ms)}ms</span>
              )}
            </div>
            <span className="text-xs text-text-disabled">{step.datasource}</span>
            {step.summary && (
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">{step.summary}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function FindingCard({ finding }: { finding: InvestigationFinding }) {
  const [expanded, setExpanded] = useState(false)
  const severityVariant = finding.severity === 'error' ? 'error' : finding.severity === 'warning' ? 'warning' : 'info'

  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border-weak)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: finding.color }} />
          <span className="font-semibold text-sm text-text-primary">{finding.datasource}</span>
          <Badge variant={severityVariant}>{finding.severity}</Badge>
        </div>
        {finding.raw && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-text-disabled hover:text-text-secondary transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>
      <div className="p-4">
        <p className="text-sm text-text-secondary leading-relaxed">{finding.summary}</p>
        {finding.query && (
          <pre className="mt-2 text-[11px] font-mono px-3 py-2 rounded-lg text-text-disabled"
            style={{ background: 'var(--color-bg-canvas)', border: '1px solid var(--color-border-weak)' }}>
            {finding.query}
          </pre>
        )}
        {expanded && finding.raw && (
          <pre className="mt-3 text-[11px] font-mono text-text-disabled p-3 rounded-lg overflow-x-auto"
            style={{ background: 'var(--color-bg-canvas)' }}>
            {finding.raw}
          </pre>
        )}
      </div>
    </Card>
  )
}

function HypothesisBar({ text, confidence }: { text: string; confidence: number }) {
  const pct = Math.round(confidence * 100)
  const color = confidence > 0.7 ? 'var(--color-status-error)' : confidence > 0.5 ? 'var(--color-status-warning)' : 'var(--color-ai)'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-secondary flex-1 pr-3">{text}</span>
        <span className="text-xs font-mono font-semibold flex-shrink-0" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-elevated)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

function SynthesisPanel({ synthesis, hypotheses }: { synthesis: string; hypotheses: Array<{ text: string; confidence: number }> }) {
  return (
    <Card variant="ai" className="overflow-hidden">
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--color-border-weak)' }}>
        <h3 className="font-semibold text-sm text-text-primary">Root Cause Analysis</h3>
      </div>
      <div className="p-4 space-y-4">
        <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{synthesis}</p>

        {hypotheses.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-disabled mb-3">Top Hypotheses</h4>
            <div className="space-y-3">
              {hypotheses.map((h, i) => (
                <HypothesisBar key={i} text={`${i + 1}. ${h.text}`} confidence={h.confidence} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

export function InvestigatePage() {
  const [problem, setProblem] = useState('')
  const [timeRange, setTimeRange] = useState('last_1h')
  const { investigation, isRunning, error, startInvestigation, reset } = useInvestigation()

  const handleStart = async () => {
    if (!problem.trim()) return
    await startInvestigation(problem, timeRange)
  }

  const hasResults = investigation !== null

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="flex-shrink-0 px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--color-border-weak)' }}
      >
        <div>
          <h1 className="text-lg font-bold text-white">Investigate</h1>
          <p className="text-sm text-text-secondary mt-0.5">Parallel AI analysis across all observability signals</p>
        </div>
        {hasResults && (
          <Button variant="ghost" onClick={reset}>
            <RefreshCw className="w-4 h-4" />
            New Investigation
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
        {/* Input form */}
        {!hasResults && (
          <div className="max-w-2xl mx-auto">
            <div
              className="rounded-xl p-6"
              style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-medium)' }}
            >
              <h2 className="text-base font-semibold text-text-primary mb-4">Describe the problem</h2>

              <textarea
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    void handleStart()
                  }
                }}
                placeholder="e.g. The checkout service is showing high error rates and slow response times since 14:30 UTC. Users are unable to complete purchases."
                rows={4}
                className="w-full rounded-lg px-4 py-3 text-sm outline-none resize-none"
                style={{
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border-medium)',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-sans)',
                }}
              />

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-3">
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="text-xs rounded-md px-2.5 py-1.5 outline-none"
                    style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-medium)', color: 'var(--color-text-secondary)' }}
                  >
                    <option value="last_30m">Last 30 minutes</option>
                    <option value="last_1h">Last 1 hour</option>
                    <option value="last_3h">Last 3 hours</option>
                    <option value="last_24h">Last 24 hours</option>
                  </select>
                </div>

                <Button
                  variant="ai"
                  onClick={() => void handleStart()}
                  isLoading={isRunning}
                  disabled={!problem.trim() || isRunning}
                >
                  <Rocket className="w-4 h-4" />
                  Start Investigation
                </Button>
              </div>

              {error && (
                <div className="mt-3 px-3 py-2.5 rounded-lg text-sm text-status-error"
                  style={{ background: 'rgba(242,73,92,0.08)', border: '1px solid rgba(242,73,92,0.25)' }}>
                  {error}
                </div>
              )}
            </div>

            {/* Info cards */}
            <div className="grid grid-cols-3 gap-3 mt-6">
              {[
                { icon: '🔴', label: 'Prometheus / Mimir', desc: 'RED metrics, SLO burn rate' },
                { icon: '📋', label: 'Loki', desc: 'Error patterns, log frequency' },
                { icon: '🔵', label: 'Tempo', desc: 'Slow traces, span bottlenecks' },
              ].map((item) => (
                <div key={item.label} className="rounded-lg p-3 text-center"
                  style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-weak)' }}>
                  <div className="text-2xl mb-1.5">{item.icon}</div>
                  <div className="text-xs font-medium text-text-primary">{item.label}</div>
                  <div className="text-[11px] text-text-disabled mt-0.5">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {hasResults && (
          <div className="grid grid-cols-[280px_1fr_340px] gap-4 h-full min-h-0">
            {/* Step timeline */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-disabled mb-3">Investigation Plan</h3>
              <StepTimeline steps={investigation.steps} />
              {investigation.duration_ms && (
                <p className="text-[11px] text-text-disabled mt-4">
                  Completed in {Math.round(investigation.duration_ms / 1000)}s
                </p>
              )}
            </div>

            {/* Findings */}
            <div className="space-y-3 overflow-y-auto scrollbar-thin">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-disabled mb-3">Signal Evidence</h3>
              {investigation.findings.length === 0 && isRunning ? (
                <div className="flex items-center gap-2 text-sm text-text-disabled py-6">
                  <Loader className="w-4 h-4 animate-spin" />
                  Querying datasources...
                </div>
              ) : investigation.findings.length === 0 ? (
                <div className="rounded-xl p-6 text-center"
                  style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-weak)' }}>
                  <p className="text-sm text-text-disabled">No significant findings detected</p>
                  <p className="text-xs text-text-disabled mt-1">Try a wider time range or connect your datasources</p>
                </div>
              ) : (
                investigation.findings.map((f) => <FindingCard key={f.datasource} finding={f} />)
              )}
            </div>

            {/* Synthesis */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-disabled mb-3">AI Synthesis</h3>
              {investigation.synthesis ? (
                <SynthesisPanel
                  synthesis={investigation.synthesis}
                  hypotheses={investigation.hypotheses}
                />
              ) : (
                <Card className="p-4">
                  <div className="flex items-center gap-2 text-sm text-text-disabled">
                    <Loader className="w-4 h-4 animate-spin" />
                    {isRunning ? 'Analyzing findings...' : 'No synthesis available'}
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
