import { motion } from 'framer-motion'
import { Activity, FileText, Database, Search, AlertTriangle, BarChart2 } from 'lucide-react'
import { AIAvatar } from '@/components/ui/AIAvatar'

interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void
}

const SUGGESTIONS = [
  {
    icon: AlertTriangle,
    category: 'Investigation',
    title: 'High Error Rate',
    prompt: 'Why is the checkout service showing a high error rate? Investigate using metrics and logs.',
    iconColor: 'text-[#FBB849]',
    borderColor: 'border-[rgba(251,184,73,0.2)]',
    hoverGlow: '0 0 0 1px rgba(251,184,73,0.45), 0 8px 24px rgba(0,0,0,0.4)',
  },
  {
    icon: Activity,
    category: 'Metrics',
    title: 'Service Health',
    prompt: 'Show me the P99 latency, error rate, and request rate for all services in the last hour.',
    iconColor: 'text-accent-blue',
    borderColor: 'border-blue-500/20',
    hoverGlow: '0 0 0 1px rgba(59,130,246,0.45), 0 8px 24px rgba(0,0,0,0.4)',
  },
  {
    icon: FileText,
    category: 'Logs',
    title: 'Error Patterns',
    prompt: 'What are the top error patterns in the payment service logs for the last 30 minutes?',
    iconColor: 'text-[#FACC15]',
    borderColor: 'border-[rgba(250,204,21,0.2)]',
    hoverGlow: '0 0 0 1px rgba(250,204,21,0.45), 0 8px 24px rgba(0,0,0,0.4)',
  },
  {
    icon: Search,
    category: 'Traces',
    title: 'Slow Requests',
    prompt: 'Find the slowest traces in the api-gateway service and explain what is causing the latency.',
    iconColor: 'text-accent-cyan',
    borderColor: 'border-[rgba(34,211,238,0.2)]',
    hoverGlow: '0 0 0 1px rgba(34,211,238,0.45), 0 8px 24px rgba(0,0,0,0.4)',
  },
  {
    icon: BarChart2,
    category: 'Dashboard',
    title: 'List Dashboards',
    prompt: 'List all available Grafana dashboards and tell me which ones relate to Kubernetes.',
    iconColor: 'text-[#A78BFA]',
    borderColor: 'border-[rgba(167,139,250,0.2)]',
    hoverGlow: '0 0 0 1px rgba(167,139,250,0.45), 0 8px 24px rgba(0,0,0,0.4)',
  },
  {
    icon: Database,
    category: 'Query',
    title: 'SLO Burn Rate',
    prompt: 'Calculate the SLO burn rate for the checkout service assuming a 99.9% availability target.',
    iconColor: 'text-[#FB923C]',
    borderColor: 'border-[rgba(251,146,60,0.2)]',
    hoverGlow: '0 0 0 1px rgba(251,146,60,0.45), 0 8px 24px rgba(0,0,0,0.4)',
  },
]

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
}

const heroVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
}

export function SuggestedPrompts({ onSelect }: SuggestedPromptsProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center h-full px-6 py-8 overflow-y-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Hero */}
      <motion.div
        className="flex flex-col items-center mb-10"
        variants={heroVariants}
      >
        <AIAvatar size="lg" breathing className="mb-6" />

        <h1 className="text-28 font-bold mb-3 text-center gradient-text-ai leading-tight">
          Ask anything about your infrastructure
        </h1>

        <div className="flex items-center gap-2 mt-1">
          {/* Pulsing green dot */}
          <div className="relative w-1.5 h-1.5 flex-shrink-0">
            <div className="absolute inset-0 rounded-full bg-status-success" />
            <div className="absolute inset-0 rounded-full bg-status-success animate-ping opacity-60" />
          </div>
          <p className="text-13 text-on-muted text-center">
            Connected to Grafana · Query metrics, logs, traces, and dashboards with natural language
          </p>
        </div>
      </motion.div>

      {/* Suggestion grid */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-3xl"
        variants={containerVariants}
      >
        {SUGGESTIONS.map((s) => {
          const Icon = s.icon
          return (
            <motion.button
              key={s.title}
              onClick={() => onSelect(s.prompt)}
              variants={cardVariants}
              whileHover={{ y: -2, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
              whileTap={{ scale: 0.98 }}
              className={`text-left rounded-xl p-4 border bg-surface transition-shadow duration-200 ${s.borderColor} group`}
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = s.hoverGlow
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)'
              }}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0">
                  <Icon className={`w-4 h-4 ${s.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-10 font-semibold uppercase tracking-widest text-on-subtle mb-1">
                    {s.category}
                  </div>
                  <div className="text-13 font-semibold text-on-primary mb-1.5">
                    {s.title}
                  </div>
                  <p className="text-12 text-on-muted leading-relaxed line-clamp-2">
                    {s.prompt}
                  </p>
                </div>
              </div>
            </motion.button>
          )
        })}
      </motion.div>
    </motion.div>
  )
}
