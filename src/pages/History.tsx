/**
 * src/pages/History.tsx
 *
 * Shows a list of past download sessions with status badges,
 * file counts, timestamps, and a clear-all action.
 */

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  History as HistoryIcon,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Trash2,
  FolderOpen,
  Clock,
} from 'lucide-react'
import { useDownloadStore } from '../store/downloadStore'
import type { HistoryEntry } from '../types/global'
import toast from 'react-hot-toast'

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  completed: {
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    label: 'Completed',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  error: {
    icon: <AlertCircle className="w-4 h-4 text-red-400" />,
    label: 'Failed',
    badge: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
  partial: {
    icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
    label: 'Partial',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
}

// ─── Single history row ────────────────────────────────────────────────────────

function HistoryRow({ entry, index }: { entry: HistoryEntry; index: number }): JSX.Element {
  const config = STATUS_CONFIG[entry.status]

  const startDate = new Date(entry.startedAt)
  const endDate = new Date(entry.completedAt)
  const durationMs = endDate.getTime() - startDate.getTime()
  const durationStr =
    durationMs < 60000
      ? `${Math.round(durationMs / 1000)}s`
      : `${Math.round(durationMs / 60000)}m`

  const completionPct =
    entry.totalFiles > 0 ? Math.round((entry.downloadedFiles / entry.totalFiles) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      className="bg-background-card border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-colors"
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {config.icon}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">@{entry.channelId}</p>
            <p className="text-[11px] text-white/35 font-mono truncate mt-0.5">{entry.downloadPath}</p>
          </div>
        </div>

        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${config.badge}`}>
          {config.label}
        </span>
      </div>

      {/* ── Progress bar (mini) ──────────────────────────────────────── */}
      <div className="mb-3">
        <div className="h-1 rounded-full bg-white/5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              entry.status === 'completed'
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                : entry.status === 'error'
                ? 'bg-gradient-to-r from-red-500 to-red-400'
                : 'bg-gradient-to-r from-amber-500 to-amber-400'
            }`}
            style={{ width: `${completionPct}%` }}
          />
        </div>
      </div>

      {/* ── Stats row ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 text-[11px] text-white/35">
        <span className="flex items-center gap-1">
          <FolderOpen className="w-3 h-3" />
          {entry.downloadedFiles.toLocaleString()} / {entry.totalFiles.toLocaleString()} files
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {durationStr}
        </span>
        <span className="ml-auto">
          {startDate.toLocaleDateString()} {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* ── Error message ─────────────────────────────────────────────── */}
      {entry.errorMessage && (
        <p className="mt-2 text-[11px] text-red-400/70 bg-red-500/5 rounded-lg px-3 py-2 font-mono">
          {entry.errorMessage}
        </p>
      )}
    </motion.div>
  )
}

// ─── History page ─────────────────────────────────────────────────────────────

export function History(): JSX.Element {
  const { history, setHistory } = useDownloadStore()

  // Load history from disk on mount
  useEffect(() => {
    async function load(): Promise<void> {
      const entries = await window.tgfetch.history.get()
      setHistory(entries)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleClearHistory(): Promise<void> {
    await window.tgfetch.history.clear()
    setHistory([])
    toast.success('History cleared.')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full space-y-5"
    >
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Download History</h1>
          <p className="text-sm text-white/40 mt-1">
            {history.length} session{history.length !== 1 ? 's' : ''} recorded
          </p>
        </div>

        {history.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleClearHistory}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-red-400/70 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            Clear all
          </motion.button>
        )}
      </div>

      {/* ── List ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {history.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 text-white/20 gap-5"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="relative relative flex items-center justify-center w-24 h-24 rounded-full bg-white/5 border border-white/10"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              >
                <FolderOpen className="w-10 h-10 text-white/40" strokeWidth={1.5} />
              </motion.div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-background-card flex items-center justify-center border border-white/10">
                <HistoryIcon className="w-4 h-4 text-white/60" />
              </div>
            </motion.div>
            <div className="text-center">
              <p className="text-base font-semibold text-white/70">No history yet</p>
              <p className="text-sm mt-1.5 text-white/40 max-w-xs mx-auto">Your download sessions will appear here.</p>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {history.map((entry, index) => (
              <HistoryRow key={entry.id} entry={entry} index={index} />
            ))}
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
