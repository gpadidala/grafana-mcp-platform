import { create } from 'zustand'

interface AuthState {
  token: string | null
  userId: string | null
  authType: 'jwt' | 'api_key' | null
  isAuthenticated: boolean

  setToken: (token: string, authType?: 'jwt' | 'api_key') => void
  setApiKey: (apiKey: string) => void
  clearAuth: () => void
  getAuthHeaders: () => Record<string, string>
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  token: null,
  userId: null,
  authType: null,
  isAuthenticated: false,

  setToken: (token, authType = 'jwt') => {
    // Token stored in memory only — never localStorage
    set({ token, authType, isAuthenticated: true })
  },

  setApiKey: (apiKey) => {
    set({ token: apiKey, authType: 'api_key', isAuthenticated: true })
  },

  clearAuth: () =>
    set({ token: null, userId: null, authType: null, isAuthenticated: false }),

  getAuthHeaders: () => {
    const { token, authType } = get()
    if (!token) return {}
    if (authType === 'api_key') return { 'X-API-Key': token }
    return { Authorization: `Bearer ${token}` }
  },
}))
