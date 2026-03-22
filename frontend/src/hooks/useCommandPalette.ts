import { useCallback, useEffect } from 'react'
import { useUIStore } from '@/store/uiStore'

export function useCommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore()

  const open = useCallback(() => setCommandPaletteOpen(true), [setCommandPaletteOpen])
  const close = useCallback(() => setCommandPaletteOpen(false), [setCommandPaletteOpen])
  const toggle = useCallback(() => setCommandPaletteOpen(!commandPaletteOpen), [commandPaletteOpen, setCommandPaletteOpen])

  // Global ⌘K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        open()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  return { isOpen: commandPaletteOpen, open, close, toggle }
}
