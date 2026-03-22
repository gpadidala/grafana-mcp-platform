import { useEffect } from 'react'
import { useUIStore } from '@/store/uiStore'

export function useKeyboardShortcuts() {
  const { toggleCommandPalette, toggleSidebarCollapsed } = useUIStore()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey

      // ⌘K — Command palette
      if (meta && e.key === 'k') {
        e.preventDefault()
        toggleCommandPalette()
        return
      }

      // ⌘/ — Toggle sidebar
      if (meta && e.key === '/') {
        e.preventDefault()
        toggleSidebarCollapsed()
        return
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [toggleCommandPalette, toggleSidebarCollapsed])
}
