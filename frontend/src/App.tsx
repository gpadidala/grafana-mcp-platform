import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from '@/components/Layout/AppShell'
import { ChatPage } from '@/pages/ChatPage'
import { InvestigatePage } from '@/pages/InvestigatePage'
import { DashboardsPage } from '@/pages/DashboardsPage'
import { QueryBuilderPage } from '@/pages/QueryBuilderPage'
import { SkillsPage } from '@/pages/SkillsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { useAuthStore } from '@/store/authStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function AppRoutes() {
  const { setApiKey, isAuthenticated } = useAuthStore()

  useEffect(() => {
    const apiKey = import.meta.env.VITE_API_KEY
    if (apiKey && !isAuthenticated) {
      setApiKey(apiKey as string)
    }
  }, [isAuthenticated, setApiKey])

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/chat" replace />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/investigate" element={<InvestigatePage />} />
        <Route path="/dashboards" element={<DashboardsPage />} />
        <Route path="/query" element={<QueryBuilderPage />} />
        <Route path="/skills" element={<SkillsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Routes>
    </AppShell>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="dark">
          <AppRoutes />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
