/**
 * src/components/Sidebar.tsx
 *
 * Left navigation sidebar with page links, active highlight, and collapse support.
 * Active state shown with blue accent gradient pill.
 */

import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  LogIn,
  Radio,
} from 'lucide-react'
import { useDownloadStore } from '../store/downloadStore'
import type { AppPage } from '../store/downloadStore'

interface NavItem {
  id: AppPage
  label: string
  icon: JSX.Element
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'channels', label: 'My Channels', icon: <Radio className="w-4 h-4" /> },
  { id: 'history', label: 'History', icon: <History className="w-4 h-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
]

export function Sidebar(): JSX.Element {
  const {
    activePage,
    setActivePage,
    sidebarCollapsed,
    setSidebarCollapsed,
    auth,
    setAuth,
  } = useDownloadStore()

  async function handleLogout(): Promise<void> {
    await window.tgfetch.auth.logout()
  }

  const isAuthenticated = auth.status === 'authenticated'

  return (
    <motion.nav
      initial={false}
      animate={{ width: sidebarCollapsed ? 56 : 200 }}
      transition={{ duration: 0.22, ease: 'easeInOut' }}
      className="flex flex-col border-r border-white/10 bg-background-card shrink-0 overflow-hidden py-4"
    >
      {/* ── Nav items ───────────────────────────────────────────────────── */}
      <div className="flex-1 px-2 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = activePage === item.id
          return (
            <motion.button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              whileHover={{ x: 4, transition: { duration: 0.2 } }}
              whileTap={{ scale: 0.95 }}
              className={`
                w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium
                transition-all duration-200 relative overflow-hidden group
                ${isActive
                  ? 'text-white'
                  : 'text-white/45 hover:text-white/80'
                }
              `}
            >
              {/* Hover background for subtle motion */}
              {!isActive && (
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-200 rounded-xl" />
              )}

                                          {/* Active background with subtle animation */}
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-bg"
                  className="absolute inset-0 rounded-xl bg-white/[0.04]"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              
              {/* Left glowing bar */}
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-bar"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-accent-blue rounded-r-full shadow-glow-blue"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}

              {/* Icon */}
              <span className={`relative z-10 shrink-0 ${isActive ? 'text-accent-blue' : ''}`}>
                {item.icon}
              </span>

              {/* Label */}
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="relative z-10 truncate"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          )
        })}
      </div>

      {/* ── Auth button ─────────────────────────────────────────────────── */}
      <div className="px-2 mb-2">
        {isAuthenticated ? (
          <motion.button
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleLogout}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="truncate"
                >
                  Disconnect
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        ) : (
          <div
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-emerald-400/70"
          >
            <LogIn className="w-4 h-4 shrink-0" />
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="truncate"
                >
                  Not connected
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Collapse toggle ──────────────────────────────────────────────── */}
      <div className="px-2 pt-2 border-t border-white/10">
        {/* Footer brand strip */}
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 text-xs text-white/40"
            >
              <p className="font-medium">© 2026 Loki</p>
              <p className="text-white/25 mt-0.5">Built with Electron & Telegram MTProto</p>
            </motion.div>
          )}
        </AnimatePresence>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="w-full flex items-center justify-center py-2 rounded-xl text-white/25 hover:text-white/50 hover:bg-white/5 transition-colors"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </motion.button>
      </div>
    </motion.nav>
  )
}
