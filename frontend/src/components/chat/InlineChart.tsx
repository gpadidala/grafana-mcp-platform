import { useRef } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { ExternalLink } from 'lucide-react'

interface MetricDataPoint {
  timestamp: number
  value: number
}

interface InlineChartProps {
  data: MetricDataPoint[]
  title?: string
  unit?: string
  color?: string
  height?: number
}

export function InlineChart({
  data,
  title,
  unit = '',
  color = 'var(--color-ai)',
  height = 160,
}: InlineChartProps) {
  const gradientId = useRef(`ig-${Math.random().toString(36).slice(2, 8)}`).current

  if (!data || data.length === 0) return null

  const formatted = data.map((d) => ({
    time: new Date(d.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    value: d.value,
  }))

  const latest = data[data.length - 1]?.value
  const latestDisplay = latest !== undefined ? `${Number(latest.toFixed(3))}${unit}` : '—'

  return (
    <div
      className="rounded-xl overflow-hidden mt-2 mb-1"
      style={{
        background: 'var(--color-bg-canvas)',
        border: '1px solid var(--color-border-weak)',
        animation: 'slideUp 0.2s ease-out, fadeIn 0.2s ease-out',
      }}
    >
      {/* Title bar */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ borderBottom: '1px solid var(--color-border-weak)' }}
      >
        <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          {title ?? 'Metric'}
        </span>
        <span className="text-sm font-bold" style={{ color }}>
          {latestDisplay}
        </span>
      </div>

      {/* Chart area */}
      <div className="px-2 py-3" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formatted} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border-weak)"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: 'var(--color-text-disabled)' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--color-text-disabled)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${Number(v.toFixed(2))}${unit}`}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border-medium)',
                borderRadius: '6px',
                fontSize: '11px',
                color: 'var(--color-text-primary)',
              }}
              labelStyle={{ color: 'var(--color-text-disabled)' }}
              formatter={(v: number) => [`${v}${unit}`, 'Value']}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={1.5}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 3, fill: color }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-end px-4 py-1.5"
        style={{ borderTop: '1px solid var(--color-border-weak)' }}
      >
        <a
          href="#"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[11px] transition-colors hover:opacity-80"
          style={{ color: 'var(--color-ai)' }}
        >
          <ExternalLink className="w-3 h-3" />
          Open in Grafana →
        </a>
      </div>
    </div>
  )
}
