import { useState } from 'react'
import { Plus, Play, Loader, Search } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'
import { useSkills, useRunSkill, type Skill } from '@/hooks/useSkills'

const CATEGORY_COLORS: Record<string, string> = {
  investigation: '#f46800',
  metrics: '#C084FC',
  logs: '#FACC15',
  traces: '#22D3EE',
  general: '#9fa7b3',
  dashboards: '#3d9df3',
  knowledge: '#73bf69',
}

const CATEGORIES = ['all', 'investigation', 'metrics', 'logs', 'traces', 'general'] as const
type Category = typeof CATEGORIES[number]

function SkillCard({ skill }: { skill: Skill }) {
  const { mutate: run, isPending: running } = useRunSkill()
  const color = CATEGORY_COLORS[skill.category] ?? '#9fa7b3'

  const handleRun = () => {
    run({ id: skill.id, variables: {} } as { id: string; variables: Record<string, string> })
  }

  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden transition-all duration-200 group',
        running ? 'border-ai/40 shadow-ai-glow' : 'border-border-weak hover:border-border-medium hover:shadow-elevated',
      )}
      style={{
        background: 'var(--color-bg-secondary)',
        border: `1px solid ${running ? 'rgba(61,157,243,0.4)' : 'var(--color-border-weak)'}`,
      }}
    >
      {/* Category stripe */}
      <div className="h-1" style={{ background: color }} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-1"
              style={{ color }}>
              {skill.category}
            </div>
            <h3 className="text-sm font-semibold text-text-primary group-hover:text-white transition-colors">
              {skill.name}
            </h3>
          </div>
          {running && <Badge variant="ai">Running</Badge>}
        </div>

        <p className="text-xs text-text-disabled leading-relaxed mb-3">{skill.description}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {skill.tags.map((t) => (
            <span
              key={t}
              className="px-1.5 py-0.5 rounded text-[10px]"
              style={{ background: 'var(--color-bg-overlay)', color: 'var(--color-text-disabled)', border: '1px solid var(--color-border-weak)' }}
            >
              {t}
            </span>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="text-[11px] text-text-disabled">
            {skill.last_run_at
              ? `Last run: ${new Date(skill.last_run_at).toLocaleDateString()}`
              : skill.run_count > 0 ? `Run ${skill.run_count}x` : 'Never run'
            } · {skill.step_count} steps
          </div>
          <button
            onClick={handleRun}
            disabled={running}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
              running
                ? 'opacity-60 cursor-not-allowed text-ai'
                : 'btn-ai text-xs px-2.5 py-1.5'
            )}
          >
            {running ? <Loader className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
            {running ? 'Running...' : 'Run'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SkillCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-weak)' }}>
      <div className="h-1 bg-grafana-elevated" />
      <div className="p-4 space-y-3">
        <Skeleton height={10} width="40%" />
        <Skeleton height={14} width="70%" />
        <Skeleton height={11} width="90%" />
        <Skeleton height={11} width="60%" />
        <div className="flex gap-1">
          <Skeleton height={18} width={60} />
          <Skeleton height={18} width={50} />
        </div>
      </div>
    </div>
  )
}

export function SkillsPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category>('all')
  const { data: skills, isLoading, error } = useSkills(
    category !== 'all' ? category : undefined,
    query || undefined,
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="flex-shrink-0 px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--color-border-weak)' }}
      >
        <div>
          <h1 className="text-lg font-bold text-white">Skills</h1>
          <p className="text-sm text-text-secondary mt-0.5">Reusable investigation playbooks</p>
        </div>
        <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium btn-primary">
          <Plus className="w-4 h-4" />
          New Skill
        </button>
      </div>

      {/* Filters */}
      <div
        className="flex-shrink-0 px-6 py-3 flex items-center gap-3"
        style={{ borderBottom: '1px solid var(--color-border-weak)' }}
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-disabled" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search skills..."
            className="input pl-8 text-sm w-48"
          />
        </div>

        <div className="flex items-center gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors',
                category === c
                  ? 'bg-grafana-elevated text-text-primary border border-border-medium'
                  : 'text-text-disabled hover:text-text-secondary'
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SkillCardSkeleton key={i} />)}
          </div>
        ) : error ? (
          <EmptyState
            icon={<span className="text-4xl">📚</span>}
            heading="Could not load skills"
            subtext="Check your backend connection"
          />
        ) : !skills || skills.length === 0 ? (
          <EmptyState
            icon={<span className="text-4xl">📚</span>}
            heading={query ? `No skills matching "${query}"` : 'No skills yet'}
            subtext="Create your first skill or check back after skills are loaded from templates"
            action={
              <button className="btn-primary text-sm px-4 py-2 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create Skill
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {skills.map((s) => (
              <SkillCard key={s.id} skill={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
