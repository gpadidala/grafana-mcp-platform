import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

export type DataSourceType =
  | 'prometheus'
  | 'loki'
  | 'tempo'
  | 'pyroscope'
  | 'faro'
  | 'k8s'
  | 'grafana'
  | 'mimir'
  | 'sql'
  | 'mysql'
  | 'postgres'
  | 'elasticsearch'
  | 'generic'

// ── Brand config ──────────────────────────────────────────────────────────────

const CONFIG: Record<DataSourceType, { color: string; label: string; title: string }> = {
  prometheus:    { color: '#e6522c', label: 'P',   title: 'Prometheus'     },
  loki:          { color: '#FACC15', label: 'L',   title: 'Loki'           },
  tempo:         { color: '#22D3EE', label: 'T',   title: 'Tempo'          },
  pyroscope:     { color: '#FB923C', label: 'Py',  title: 'Pyroscope'      },
  faro:          { color: '#F472B6', label: 'F',   title: 'Faro'           },
  k8s:           { color: '#326CE5', label: 'K8s', title: 'Kubernetes'     },
  grafana:       { color: '#f46800', label: 'G',   title: 'Grafana'        },
  mimir:         { color: '#C084FC', label: 'M',   title: 'Mimir'          },
  sql:           { color: '#73bf69', label: 'SQL',  title: 'SQL'            },
  mysql:         { color: '#00758f', label: 'My',  title: 'MySQL'          },
  postgres:      { color: '#336791', label: 'PG',  title: 'PostgreSQL'     },
  elasticsearch: { color: '#00bfb3', label: 'ES',  title: 'Elasticsearch'  },
  generic:       { color: '#5a6070', label: '?',   title: 'Unknown'        },
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface DataSourceIconProps {
  type: DataSourceType
  /** Pixel size of the icon badge (default 16) */
  size?: number
  /** Render the datasource name next to the icon */
  showLabel?: boolean
  className?: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DataSourceIcon({
  type,
  size = 16,
  showLabel = false,
  className,
}: DataSourceIconProps) {
  const cfg = CONFIG[type] ?? CONFIG.generic

  // Scale font relative to badge size
  const fontSize = Math.max(8, Math.round(size * 0.5))

  return (
    <span
      className={cn('inline-flex items-center gap-1.5 flex-shrink-0', className)}
      title={cfg.title}
    >
      {/* Colored badge */}
      <span
        className="inline-flex items-center justify-center font-bold rounded leading-none flex-shrink-0"
        style={{
          width:      size,
          height:     size,
          fontSize:   fontSize,
          color:      cfg.color,
          background: `${cfg.color}22`,
          border:     `1px solid ${cfg.color}55`,
          // Allow multi-char labels (e.g. "Py", "K8s") to be slightly wider
          minWidth:   size,
          paddingLeft:  size > 20 ? 2 : 1,
          paddingRight: size > 20 ? 2 : 1,
          borderRadius: Math.max(2, Math.round(size * 0.25)),
        }}
      >
        {cfg.label}
      </span>

      {showLabel && (
        <span
          className="text-xs font-medium"
          style={{ color: cfg.color }}
        >
          {cfg.title}
        </span>
      )}
    </span>
  )
}
