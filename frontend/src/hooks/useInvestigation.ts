import { useState, useCallback, useRef } from 'react'
import { investigationsApi } from '@/services/api'

export interface InvestigationStep {
  id: string
  label: string
  datasource: string
  status: 'pending' | 'running' | 'done' | 'failed'
  duration_ms?: number
  summary?: string
}

export interface InvestigationFinding {
  datasource: string
  color: string
  summary: string
  severity: 'error' | 'warning' | 'info'
  query?: string
  raw?: string
}

export interface Investigation {
  id: string
  problem: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  steps: InvestigationStep[]
  findings: InvestigationFinding[]
  synthesis?: string
  hypotheses: Array<{ text: string; confidence: number }>
  time_range: string
  services: string[]
  started_at: string
  completed_at?: string
  duration_ms?: number
}

export function useInvestigation() {
  const [investigation, setInvestigation] = useState<Investigation | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const startInvestigation = useCallback(
    async (problem: string, timeRange: string, services: string[] = []) => {
      setIsRunning(true)
      setError(null)
      setInvestigation(null)

      try {
        const { data } = await investigationsApi.start({
          problem,
          time_range: timeRange,
          services,
        })

        setInvestigation(data as Investigation)

        // Poll for updates every 1.5s until completed/failed
        pollRef.current = setInterval(async () => {
          try {
            const { data: updated } = await investigationsApi.get((data as Investigation).id)
            const inv = updated as Investigation
            setInvestigation(inv)

            if (inv.status === 'completed' || inv.status === 'failed') {
              stopPolling()
              setIsRunning(false)
            }
          } catch (pollErr) {
            console.error('Investigation poll error:', pollErr)
          }
        }, 1500)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Investigation failed')
        setIsRunning(false)
      }
    },
    [stopPolling]
  )

  const reset = useCallback(() => {
    stopPolling()
    setInvestigation(null)
    setIsRunning(false)
    setError(null)
  }, [stopPolling])

  return { investigation, isRunning, error, startInvestigation, reset }
}
