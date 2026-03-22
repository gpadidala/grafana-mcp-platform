import { useState } from 'react'
import { Copy, Check, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import SyntaxHighlighter from 'react-syntax-highlighter'
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs'
import { cn } from '@/lib/utils'

interface CodeBlockProps {
  code: string
  language?: string
  filename?: string
}

const QUERY_LANGUAGES = ['promql', 'logql', 'traceql']

export function CodeBlock({ code, language = 'text', filename }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isQueryLang = QUERY_LANGUAGES.includes(language.toLowerCase())
  const isLong = code.split('\n').length > 20

  return (
    <div
      className="rounded-lg overflow-hidden my-3"
      style={{ background: 'var(--color-bg-canvas)', border: '1px solid var(--color-border-medium)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ background: 'var(--color-bg-elevated)', borderBottom: '1px solid var(--color-border-weak)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded" style={{ background: 'var(--color-bg-overlay)', color: 'var(--color-ai)' }}>
            {language}
          </span>
          {filename && (
            <span className="text-[11px] text-text-disabled">{filename}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {isQueryLang && (
            <button
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-ai hover:bg-grafana-overlay transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Run in Grafana
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors text-text-disabled hover:text-text-primary hover:bg-grafana-overlay"
          >
            {copied ? <Check className="w-3 h-3 text-status-success" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Code */}
      <div className={cn('overflow-auto', !expanded && isLong ? 'max-h-96' : '')}>
        <SyntaxHighlighter
          language={language === 'promql' || language === 'logql' ? 'bash' : language}
          style={atomOneDark}
          customStyle={{
            margin: 0,
            background: 'transparent',
            fontSize: '12px',
            lineHeight: '1.6',
            padding: '14px 16px',
          }}
          showLineNumbers={code.split('\n').length > 4}
          lineNumberStyle={{ color: 'var(--color-text-disabled)', fontSize: '11px', minWidth: '2em' }}
        >
          {code}
        </SyntaxHighlighter>
      </div>

      {/* Expand toggle */}
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-center gap-1 py-1.5 text-[11px] text-text-disabled hover:text-text-secondary hover:bg-grafana-elevated transition-colors"
          style={{ borderTop: '1px solid var(--color-border-weak)' }}
        >
          {expanded ? <><ChevronUp className="w-3 h-3" />Show less</> : <><ChevronDown className="w-3 h-3" />Show all ({code.split('\n').length} lines)</>}
        </button>
      )}
    </div>
  )
}
