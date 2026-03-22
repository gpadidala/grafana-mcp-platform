import { useQuery } from '@tanstack/react-query'
import { grafanaApi } from '@/services/api'

export function useGrafanaDashboards(query?: string) {
  return useQuery({
    queryKey: ['dashboards', query],
    queryFn: () => grafanaApi.searchDashboards(query).then((r) => r.data),
    retry: 1,
    staleTime: 60_000,
    refetchInterval: 120_000,
  })
}

export function useGrafanaDatasources() {
  return useQuery({
    queryKey: ['datasources'],
    queryFn: () => grafanaApi.getDatasources().then((r) => r.data),
    retry: 1,
    staleTime: 300_000,
  })
}
