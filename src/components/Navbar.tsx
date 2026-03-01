/**
 * src/components/Navbar.tsx
 *
 * Top navigation bar with logo, app name, and external links.
 * Includes a theme toggle and "Built by Loki" attribution.
 */

import { motion } from 'framer-motion'
import { Download, Github, Linkedin, Sun, Moon } from 'lucide-react'
import { useDownloadStore } from '../store/downloadStore'

export function Navbar(): JSX.Element {
  const { theme, setTheme } = useDownloadStore()

  function handleOpenGitHub(): void {
    window.tgfetch.shell.openExternal('https://github.com')
  }

  function handleOpenLinkedIn(): void {
    window.tgfetch.shell.openExternal('https://linkedin.com')
  }

  function toggleTheme(): void {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    window.tgfetch.theme.set(next)
    // Apply to document for Tailwind dark mode
    document.documentElement.classList.toggle('dark', next === 'dark')
  }

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-background/80 backdrop-blur-md sticky top-0 z-50"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* ── Logo + Name ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center shadow-glow-blue">
          <Download className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <span className="font-semibold text-white tracking-tight text-[15px]">
          TG<span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-blue to-accent-cyan">fetch</span>
        </span>
      </div>

      {/* ── Right actions ─────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Theme toggle */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={toggleTheme}
          className="p-1.5 rounded-md text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </motion.button>

        {/* GitHub */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={handleOpenGitHub}
          className="p-1.5 rounded-md text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors"
          title="GitHub"
        >
          <Github className="w-4 h-4" />
        </motion.button>

        {/* LinkedIn */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={handleOpenLinkedIn}
          className="p-1.5 rounded-md text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors"
          title="LinkedIn"
        >
          <Linkedin className="w-4 h-4" />
        </motion.button>

        {/* Divider */}
        <div className="w-px h-4 bg-white/10" />

        {/* Attribution */}
        <span className="text-xs text-white/30 select-none font-medium">
          Built by <span className="text-white/50">Loki</span>
        </span>
      </div>
    </motion.header>
  )
}
