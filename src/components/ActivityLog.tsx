/**
 * src/components/ActivityLog.tsx
 *
 * Collapsible right-side panel displaying real-time download events.
 * Items fade in smoothly using Framer Motion's AnimatePresence.
 */

import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Terminal,
  ChevronRight,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
} from 'lucide-react'
import { useDownloadStore } from '../store/downloadStore'
import type { ActivityLogItem } from '../types/global'

// ─── Icon per log type ────────────────────────────────────────────────────────

const LOG_ICONS: Record<ActivityLogItem['type'], JSX.Element> = {
  success: <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />,
  error: <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />,
  info: <Info className="w-3 h-3 text-blue-400 shrink-0" />,
  warning: <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />,
}

const LOG_TEXT_COLORS: Record<ActivityLogItem['type'], string> = {
  success: 'text-emerald-300',
  error: 'text-red-300',
  info: 'text-blue-400',
  warning: 'text-amber-300',
}

// ─── Single log entry ─────────────────────────────────────────────────────────

function LogEntry({ item }: { item: ActivityLogItem }): JSX.Element {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 0, y: 12, height: 0 }}
      animate={{ opacity: 1, x: 0, y: 0, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-colors"
    >
      {/* Icon */}
      <div className="mt-0.5">{LOG_ICONS[item.type]}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {item.fileName && (
          <p className="text-[10px] text-white/30 font-mono truncate mb-0.5">{item.fileName}</p>
        )}
        <p className={`text-[11px] font-medium leading-snug break-words ${LOG_TEXT_COLORS[item.type]}`}>
          {item.message}
        </p>
      </div>

      {/* Timestamp */}
      <time className="text-[10px] text-white/20 font-mono shrink-0 mt-0.5">
        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </time>
    </motion.div>
  )
}

// ─── Main panel ──────────────────────────────────────────────────────────────

export function ActivityLog(): JSX.Element {
  const { activityLog, clearLog, activityLogOpen, setActivityLogOpen } = useDownloadStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to top when new items arrive (newest-first)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [activityLog.length])

  return (
    <motion.aside
      initial={false}
      animate={{ width: activityLogOpen ? 320 : 40 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="flex flex-col border-l border-white/5 bg-white/[0.02] backdrop-blur-xl shrink-0 overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.3)]"
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-white/10">
        {/* Toggle button */}
        <motion.button
          onClick={() => setActivityLogOpen(!activityLogOpen)}
          className="p-1 rounded-md text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
          title={activityLogOpen ? 'Collapse log' : 'Expand log'}
        >
          <motion.div
            animate={{ rotate: activityLogOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="w-4 h-4" />
          </motion.div>
        </motion.button>

        <AnimatePresence>
          {activityLogOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 flex-1 ml-2"
            >
              <Terminal className="w-3.5 h-3.5 text-white/40" />
              <span className="text-xs font-bold text-white/70 uppercase tracking-widest">
                Activity Log
              </span>
              {activityLog.length > 0 && (
                <span className="ml-auto text-[10px] font-bold text-white/20 bg-white/5 rounded-full px-1.5 py-0.5">
                  {activityLog.length}
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Clear button */}
        <AnimatePresence>
          {activityLogOpen && activityLog.length > 0 && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={clearLog}
              className="p-1 rounded-md text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-colors ml-1"
              title="Clear log"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ── Log list ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {activityLogOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            ref={scrollRef}
            className="flex-1 overflow-y-auto py-2 space-y-0.5 scrollbar-thin"
          >
            {activityLog.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="flex flex-col items-center justify-center h-full min-h-[160px] text-white/20 gap-3"
              >
                <div className="relative">
                  <Terminal className="w-8 h-8 opacity-20" />
                  <motion.div
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="absolute bottom-1 right-1 w-2 h-2 rounded-sm bg-white/40"
                  />
                </div>
                <p className="text-xs font-medium tracking-wide text-white/30">Awaiting activity...</p>
              </motion.div>
            ) : (
              <AnimatePresence initial={false}>
                {activityLog.map((item) => (
                  <LogEntry key={item.id} item={item} />
                ))}
              </AnimatePresence>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  )
}
