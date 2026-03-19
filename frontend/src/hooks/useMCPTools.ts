import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { mcpApi } from '@/services/api'
import type { MCPTool } from '@/types/mcp'

export function useMCPTools() {
  const queryClient = useQueryClient()

  const query = useQuery<MCPTool[]>({
    queryKey: ['mcp-tools'],
    queryFn: async () => {
      const res = await mcpApi.listTools()
      return res.data
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  const refreshMutation = useMutation({
    mutationFn: () => mcpApi.refreshTools(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcp-tools'] })
    },
  })

  return {
    tools: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refresh: refreshMutation.mutate,
  }
}
