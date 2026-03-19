import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// Inject auth headers on every request
apiClient.interceptors.request.use((config) => {
  const authHeaders = useAuthStore.getState().getAuthHeaders()
  Object.assign(config.headers, authHeaders)
  return config
})

// Surface HTTP errors cleanly
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().clearAuth()
    }
    return Promise.reject(err)
  }
)

// ── Grafana API ───────────────────────────────────────────────────────────────

export const grafanaApi = {
  searchDashboards: (q?: string, tag?: string, limit = 50) =>
    apiClient.get('/v1/grafana/dashboards', { params: { q, tag, limit } }),

  getDashboard: (uid: string) =>
    apiClient.get(`/v1/grafana/dashboards/${uid}`),

  getDatasources: () =>
    apiClient.get('/v1/grafana/datasources'),

  getAlerts: (state = 'firing') =>
    apiClient.get('/v1/grafana/alerts', { params: { state } }),
}

// ── MCP API ───────────────────────────────────────────────────────────────────

export const mcpApi = {
  listTools: () => apiClient.get('/v1/mcp/tools'),
  listResources: () => apiClient.get('/v1/mcp/resources'),
  refreshTools: () => apiClient.post('/v1/mcp/tools/refresh'),
}

// ── Auth API ──────────────────────────────────────────────────────────────────

export const authApi = {
  getMe: () => apiClient.get('/v1/auth/me'),
  getProviders: () => apiClient.get('/v1/auth/providers'),
}
