import { useState, useCallback, useRef } from 'react'

interface StreamingState {
  content: string
  isStreaming: boolean
  isDone: boolean
}

/**
 * Hook for consuming SSE text streams.
 * Returns character-by-character content for animated display.
 */
export function useStreaming() {
  const [state, setState] = useState<StreamingState>({
    content: '',
    isStreaming: false,
    isDone: false,
  })
  const bufferRef = useRef<string[]>([])
  const animFrameRef = useRef<number>(0)

  const start = useCallback(() => {
    bufferRef.current = []
    setState({ content: '', isStreaming: true, isDone: false })
  }, [])

  const appendToken = useCallback((token: string) => {
    bufferRef.current.push(...token.split(''))

    // Drain buffer at ~60fps
    const drain = () => {
      const chars = bufferRef.current.splice(0, 8).join('')
      if (chars) {
        setState((prev) => ({ ...prev, content: prev.content + chars }))
      }
      if (bufferRef.current.length > 0) {
        animFrameRef.current = requestAnimationFrame(drain)
      }
    }

    cancelAnimationFrame(animFrameRef.current)
    animFrameRef.current = requestAnimationFrame(drain)
  }, [])

  const finish = useCallback(() => {
    // Flush remaining buffer
    const remaining = bufferRef.current.join('')
    bufferRef.current = []
    setState((prev) => ({
      ...prev,
      content: prev.content + remaining,
      isStreaming: false,
      isDone: true,
    }))
  }, [])

  const reset = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current)
    bufferRef.current = []
    setState({ content: '', isStreaming: false, isDone: false })
  }, [])

  return { ...state, start, appendToken, finish, reset }
}
