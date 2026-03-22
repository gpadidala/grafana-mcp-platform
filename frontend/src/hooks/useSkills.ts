import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { skillsApi } from '@/services/api'

export interface Skill {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  step_count: number
  run_count: number
  last_run_at?: string
  datasources?: string[]
}

export function useSkills(category?: string, query?: string) {
  return useQuery({
    queryKey: ['skills', category, query],
    queryFn: () => skillsApi.list(category, query).then((r) => r.data as Skill[]),
    retry: 1,
    staleTime: 30_000,
  })
}

export function useSkill(id: string) {
  return useQuery({
    queryKey: ['skills', id],
    queryFn: () => skillsApi.get(id).then((r) => r.data as Skill),
    enabled: !!id,
  })
}

export function useRunSkill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, variables }: { id: string; variables: Record<string, string> }) =>
      skillsApi.run(id, variables).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['skills'] })
    },
  })
}

export function useCreateSkill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Skill>) => skillsApi.create(data).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['skills'] })
    },
  })
}

export function useDeleteSkill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => skillsApi.delete(id).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['skills'] })
    },
  })
}
