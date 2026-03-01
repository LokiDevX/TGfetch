/**
 * src/components/ProgressBar.tsx
 *
 * Animated gradient progress bar with:
 *   - Smooth percentage transition
 *   - Shimmer effect while running
 *   - File counter label
 *   - Status text + color coding
 */

import { motion } from 'framer-motion'
import { CheckCircle, AlertCircle, Loader2, XCircle } from 'lucide-react'
import type { DownloadStatus } from '../types/global'

interface ProgressBarProps {
  percent: number
  downloaded: number
  total: number
  status: DownloadStatus
  statusMessage: string
  currentFile: string
  currentFileSize?: number
  currentFileDownloaded?: number
  speed?: number
  eta?: number
}

function formatBytes(bytes: number) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatTime(seconds: number) {
  if (!seconds || !isFinite(seconds)) return '--:--'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

const STATUS_CONFIG: Record<



  DownloadStatus,
  { label: string; color: string; icon: JSX.Element | null }
> = {
  idle: {
    label: 'Ready',
    color: 'text-white/40',
    icon: null,
  },
  running: {
    label: 'Downloading…',
    color: 'text-accent-cyan',
    icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
  },
  completed: {
    label: 'Completed',
    color: 'text-emerald-400',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  error: {
    label: 'Error',
    color: 'text-red-400',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-amber-400',
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
  partial: {
    label: 'Partial',
    color: 'text-amber-400',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
}

export function ProgressBar({
  percent,
  downloaded,
  total,
  status,
  statusMessage,
  currentFile,
  currentFileSize = 0,
  currentFileDownloaded = 0,
  speed = 0,
  eta = 0,
}: ProgressBarProps): JSX.Element {
  const config = STATUS_CONFIG[status]
  const clampedPercent = Math.min(100, Math.max(0, percent))
  const isRunning = status === 'running'
  const isCompleted = status === 'completed'

  return (
    <div className="space-y-3">
      {/* ── Header row ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-1.5 text-xs font-semibold ${config.color}`}>
          {config.icon}
          <span>{statusMessage || config.label}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* File counter */}
          {total > 0 && (
            <span className="text-xs text-white/40 font-mono tabular-nums">
              {downloaded.toLocaleString()} / {total.toLocaleString()} files
            </span>
          )}

          {/* Percentage */}
          <motion.span
            key={clampedPercent}
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="text-sm font-bold text-white tabular-nums"
          >
            {clampedPercent}%
          </motion.span>
        </div>
      </div>

      {/* ── Progress track ───────────────────────────────────────── */}
      <div className="relative h-2 rounded-full bg-white/5 overflow-hidden">
        {/* Gradient fill */}
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: isCompleted
              ? 'linear-gradient(90deg, #10b981, #34d399)'
              : status === 'error'
              ? 'linear-gradient(90deg, #ef4444, #f87171)'
              : status === 'cancelled' || status === 'partial'
              ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
              : 'linear-gradient(90deg, #3B82F6, #06B6D4)',
          }}
          initial={{ width: '0%' }}
          animate={{ width: `${clampedPercent}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />

        {/* Shimmer effect while running */}
        {isRunning && (
          <motion.div
            className="absolute inset-y-0 w-24 rounded-full"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
              left: `${Math.max(0, clampedPercent - 12)}%`,
            }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </div>

      {/* ── Current file text ─────────────────────────────────────── */}
      {currentFile && isRunning && (
        <motion.div
          key={currentFile}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-1 mt-1"
        >
          <div className="flex items-center gap-1.5 break-all">
            <span className="text-[12px] font-medium text-white/80 line-clamp-1">
              Downloading: {currentFile}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/40 font-mono tracking-tight">
            <span>
              {formatBytes(currentFileDownloaded)} / {formatBytes(currentFileSize)}
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span className="text-white/80">
              {formatBytes(speed)}/s
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>
              {formatTime(eta)} remaining
            </span>
          </div>
        </motion.div>
      )}

      {/* ── Completion animation ──────────────────────────────────── */}
      {isCompleted && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 text-emerald-400 text-xs font-semibold"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
          >
            <CheckCircle className="w-4 h-4" />
          </motion.div>
          All {total.toLocaleString()} files downloaded successfully
        </motion.div>
      )}
    </div>
  )
}
