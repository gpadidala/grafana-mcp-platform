interface StreamingTextProps {
  text: string
  isStreaming: boolean
}

export function StreamingText({ text, isStreaming }: StreamingTextProps) {
  return (
    <span>
      {text}
      {isStreaming && (
        <span
          className="inline-block w-0.5 h-4 ml-0.5 align-middle rounded-full"
          style={{
            background: 'var(--color-ai)',
            animation: 'cursor-blink 1s step-end infinite',
          }}
        />
      )}
    </span>
  )
}
