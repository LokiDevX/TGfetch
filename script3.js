const fs = require('fs');
let s = fs.readFileSync('src/components/ProgressBar.tsx', 'utf8');

// The clean top section before STATUS_CONFIG
const topSection = `/**
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
  return \`\${m.toString().padStart(2, '0')}:\${s.toString().padStart(2, '0')}\`
}

`;

s = s.replace(/[\s\S]*?(?=const STATUS_CONFIG:)/, topSection);

fs.writeFileSync('src/components/ProgressBar.tsx', s);
