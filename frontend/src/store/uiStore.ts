import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type RightPanelTab = 'skills' | 'tools' | 'history'
type Theme = 'dark'

interface UIState {
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  rightPanelOpen: boolean
  rightPanelTab: RightPanelTab
  commandPaletteOpen: boolean
  theme: Theme

  // Actions
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebarCollapsed: () => void
  setRightPanelOpen: (open: boolean) => void
  toggleRightPanel: () => void
  setRightPanelTab: (tab: RightPanelTab) => void
  setCommandPaletteOpen: (open: boolean) => void
  toggleCommandPalette: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      sidebarCollapsed: false,
      rightPanelOpen: true,
      rightPanelTab: 'tools',
      commandPaletteOpen: false,
      theme: 'dark',

      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
      toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
      setRightPanelTab: (tab) => set({ rightPanelTab: tab }),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
    }),
    {
      name: 'ui-store',
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        rightPanelOpen: s.rightPanelOpen,
        rightPanelTab: s.rightPanelTab,
        theme: s.theme,
      }),
    }
  )
)
