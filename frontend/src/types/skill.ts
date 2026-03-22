export interface SkillVariable {
  name: string
  label: string
  type: 'text' | 'select' | 'number'
  required: boolean
  options?: string[]
  default?: string
  description?: string
}

export interface SkillStep {
  id: string
  label: string
  datasource: string
  query?: string
  description?: string
}

export interface Skill {
  id: string
  title: string
  description: string
  category: 'investigation' | 'dashboard' | 'query' | 'knowledge' | 'general'
  tags: string[]
  datasources: string[]
  steps: SkillStep[]
  variables: SkillVariable[]
  createdAt?: number
  updatedAt?: number
  lastRunAt?: number
  author?: string
  template?: string
}

export interface SkillRun {
  id: string
  skillId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  variables: Record<string, string>
  steps: Array<{
    id: string
    status: 'pending' | 'running' | 'done' | 'failed'
    durationMs?: number
    finding?: {
      datasource: string
      summary: string
      data?: unknown
    }
  }>
  synthesis?: string
  error?: string
  startedAt: number
  completedAt?: number
}
