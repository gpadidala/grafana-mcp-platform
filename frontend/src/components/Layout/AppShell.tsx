import { type ReactNode } from 'react'
import { LeftSidebar } from './LeftSidebar'
import { TopNav } from './TopNav'
import { RightPanel } from './RightPanel'
import { useUIStore } from '@/store/uiStore'
import { CommandPalette } from '@/components/CommandPalette'
import { ToastContainer } from '@/components/ui/Toast'
import { ParticleBackground } from '@/components/ParticleBackground'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { rightPanelOpen } = useUIStore()

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-base relative">
      {/* Particle field — fixed, z-0, behind everything */}
      <ParticleBackground />

      {/* Ambient radial glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          background:
            'radial-gradient(ellipse at 20% 0%, rgba(59,130,246,0.06) 0%, transparent 55%), radial-gradient(ellipse at 80% 100%, rgba(6,182,212,0.04) 0%, transparent 50%)',
        }}
      />

      {/* Sidebar */}
      <div className="relative flex-shrink-0" style={{ zIndex: 10 }}>
        <LeftSidebar />
      </div>

      {/* Main column */}
      <div
        className="relative flex flex-1 flex-col overflow-hidden min-w-0"
        style={{ zIndex: 1 }}
      >
        <TopNav />

        <div className="flex flex-1 overflow-hidden min-h-0">
          <main className="flex-1 overflow-hidden flex flex-col min-w-0">
            {children}
          </main>
          {rightPanelOpen && <RightPanel />}
        </div>
      </div>

      <CommandPalette />
      <ToastContainer />
    </div>
  )
}
