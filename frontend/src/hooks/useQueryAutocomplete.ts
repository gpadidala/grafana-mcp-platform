import { useState, useCallback, useRef } from 'react'
import { apiClient } from '@/services/api'

interface AutocompleteSuggestion {
  label: string
  type: 'metric' | 'label' | 'value' | 'function'
  documentation?: string
}

export function useQueryAutocomplete(language: 'promql' | 'logql' | 'traceql' | 'sql') {
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const getSuggestions = useCallback(
    (prefix: string) => {
      clearTimeout(debounceRef.current)
      if (prefix.length < 2) {
        setSuggestions([])
        return
      }

      debounceRef.current = setTimeout(async () => {
        setLoading(true)
        try {
          const res = await apiClient.get<AutocompleteSuggestion[]>('/api/v1/query/autocomplete', {
            params: { language, prefix },
          })
          setSuggestions(res.data)
        } catch {
          setSuggestions([])
        } finally {
          setLoading(false)
        }
      }, 200)
    },
    [language]
  )

  return { suggestions, loading, getSuggestions }
}
