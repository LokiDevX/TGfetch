/**
 * src/pages/Settings.tsx
 *
 * App settings: theme toggle, data path, version info, and danger zone.
 */

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
  FolderOpen,
  Info,
  Trash2,
  Github,
  Linkedin,
  ExternalLink,
} from 'lucide-react'
import { useDownloadStore } from '../store/downloadStore'
import toast from 'react-hot-toast'

interface SettingsRowProps {
  icon: JSX.Element
  title: string
  description: string
  children: React.ReactNode
}

function SettingsRow({ icon, title, description, children }: SettingsRowProps): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white/80">{title}</p>
          <p className="text-xs text-white/35 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export function Settings(): JSX.Element {
  const { theme, setTheme, setHistory, clearLog } = useDownloadStore()
  const [dataPath, setDataPath] = useState('')
  const [version, setVersion] = useState('1.0.0')

  useEffect(() => {
    async function loadInfo(): Promise<void> {
      const [p, v] = await Promise.all([
        window.tgfetch.app.getDataPath(),
        window.tgfetch.app.getVersion(),
      ])
      setDataPath(p)
      setVersion(v)
    }
    loadInfo()
  }, [])

  function handleThemeToggle(): void {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    window.tgfetch.theme.set(next)
    document.documentElement.classList.toggle('dark', next === 'dark')
  }

  async function handleClearHistory(): Promise<void> {
    await window.tgfetch.history.clear()
    setHistory([])
    clearLog()
    toast.success('All data cleared.')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full space-y-6"
    >
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Settings</h1>
        <p className="text-sm font-medium text-white/50 mt-1">Configure TGfetch preferences</p>
      </div>

      {/* ── Appearance ────────────────────────────────────────────────── */}
      <section className="bg-background-card border border-white/10 rounded-2xl px-5">
        <div className="py-3 border-b border-white/5">
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-1.5">
            <SettingsIcon className="w-3 h-3" />
            Appearance
          </p>
        </div>

        <SettingsRow
          icon={theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          title="Theme"
          description="Toggle between dark and light mode"
        >
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleThemeToggle}
            className={`
              relative w-11 h-6 rounded-full border transition-all duration-300
              ${theme === 'dark'
                ? 'bg-accent-blue/20 border-accent-blue/40'
                : 'bg-amber-400/20 border-amber-400/40'
              }
            `}
          >
            <motion.div
              animate={{ x: theme === 'dark' ? 2 : 22 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className={`
                absolute top-0.5 w-5 h-5 rounded-full shadow-sm
                ${theme === 'dark' ? 'bg-accent-blue' : 'bg-amber-400'}
              `}
            />
          </motion.button>
        </SettingsRow>
      </section>

      {/* ── App Info ──────────────────────────────────────────────────── */}
      <section className="bg-background-card border border-white/10 rounded-2xl px-5">
        <div className="py-3 border-b border-white/5">
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-1.5">
            <Info className="w-3 h-3" />
            About TGfetch
          </p>
        </div>

        {/* About description */}
        <div className="py-4 border-b border-white/5">
          <p className="text-sm text-white/70 leading-relaxed">
            TGfetch is a modern Telegram media manager built and designed by{' '}
            <span className="text-blue-400 font-semibold">Loki</span>.
          </p>
          <p className="text-xs text-white/40 mt-2">
            Built with Electron, React, TypeScript, and Telegram MTProto for seamless media downloads and management.
          </p>
        </div>

        <SettingsRow
          icon={<Info className="w-4 h-4" />}
          title="Version"
          description="Current application version"
        >
          <span className="text-sm font-mono text-white/40">v{version}</span>
        </SettingsRow>

        <SettingsRow
          icon={<FolderOpen className="w-4 h-4" />}
          title="Data Directory"
          description="Where sessions and history are stored"
        >
          <span className="text-[11px] font-mono text-white/30 max-w-[160px] truncate block text-right">
            {dataPath || '…'}
          </span>
        </SettingsRow>

        <SettingsRow
          icon={<Github className="w-4 h-4" />}
          title="GitHub"
          description="View source code & contribute"
        >
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => window.tgfetch.shell.openExternal('https://github.com/LokiDevX/TGfetch')}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            Open <ExternalLink className="w-3 h-3" />
          </motion.button>
        </SettingsRow>

        <SettingsRow
          icon={<Linkedin className="w-4 h-4" />}
          title="LinkedIn"
          description="Connect with Lokesh Navale"
        >
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => window.tgfetch.shell.openExternal('https://www.linkedin.com/in/lokesh-navale/')}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            Open <ExternalLink className="w-3 h-3" />
          </motion.button>
        </SettingsRow>
      </section>

      {/* ── Danger Zone ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-red-500/5 border border-red-500/30 rounded-2xl px-5 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent opacity-50" />
        <div className="py-3 border-b border-red-500/10">
          <p className="text-xs font-bold text-red-400/90 uppercase tracking-widest flex items-center gap-1.5 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">
            <Trash2 className="w-3 h-3" />
            Danger Zone
          </p>
        </div>

        <SettingsRow
          icon={<Trash2 className="w-4 h-4" />}
          title="Clear All Data"
          description="Permanently delete download history and activity log"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleClearHistory}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors"
          >
            Clear Data
          </motion.button>
        </SettingsRow>
      </section>

      {/* ── Built by ──────────────────────────────────────────────────── */}
      <div className="text-center py-4">
        <p className="text-xs text-white/20">
          Built with ♥ by <span className="text-white/40 font-semibold">Loki</span>
          {' · '}
          <span className="font-mono">TGfetch v{version}</span>
        </p>
      </div>
    </motion.div>
  )
}
