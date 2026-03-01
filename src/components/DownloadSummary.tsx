import { motion } from 'framer-motion'
import { CheckCircle2, HardDrive, Clock, Activity, FileVideo } from 'lucide-react'

function formatBytes(bytes: number) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatTime(ms: number) {
  if (!ms) return '0s'
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rs = s % 60
  if (m < 60) return `${m}m ${rs}s`
  const h = Math.floor(m / 60)
  const rm = m % 60
  return `${h}h ${rm}m`
}

interface DownloadSummaryProps {
  totalFiles: number
  totalSize?: number
  durationMs?: number
  averageSpeed?: number
  onDismiss: () => void
}

export function DownloadSummary({ totalFiles, totalSize = 0, durationMs = 0, averageSpeed = 0, onDismiss }: DownloadSummaryProps) {
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="bg-background-card border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-emerald-400" />
      
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Download Complete</h3>
            <p className="text-xs text-white/50 mt-0.5">All media files saved successfully</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {/* Total Files */}
        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
          <div className="flex items-center gap-1.5 text-white/40 mb-1">
            <FileVideo className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium uppercase tracking-wider">Files</span>
          </div>
          <p className="text-lg font-semibold text-white">{totalFiles.toLocaleString()}</p>
        </div>

        {/* Total Size */}
        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
          <div className="flex items-center gap-1.5 text-white/40 mb-1">
            <HardDrive className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium uppercase tracking-wider">Size</span>
          </div>
          <p className="text-lg font-semibold text-white">{formatBytes(totalSize)}</p>
        </div>

        {/* Total Time */}
        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
          <div className="flex items-center gap-1.5 text-white/40 mb-1">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium uppercase tracking-wider">Time</span>
          </div>
          <p className="text-lg font-semibold text-white">{formatTime(durationMs)}</p>
        </div>

        {/* Avg Speed */}
        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
          <div className="flex items-center gap-1.5 text-white/40 mb-1">
            <Activity className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium uppercase tracking-wider">Speed</span>
          </div>
          <p className="text-lg font-semibold text-accent-cyan">{formatBytes(averageSpeed)}/s</p>
        </div>
      </div>

      <button
        onClick={onDismiss}
        className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-semibold text-white/80 transition-colors border border-white/10"
      >
        Dismiss
      </button>
    </motion.section>
  )
}
