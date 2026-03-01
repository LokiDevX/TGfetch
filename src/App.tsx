/**
 * src/App.tsx
 *
 * Root application component. Responsible for:
 *   - Top-level layout (Navbar → Sidebar + Content + ActivityLog)
 *   - Animated page transitions via Framer Motion
 *   - Toaster notifications
 *   - Auth dialog overlay
 *
 * Page routing is driven entirely by Zustand state (activePage),
 * no react-router needed for this single-window desktop app.
 */

import { useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Toaster } from 'react-hot-toast'

import { Navbar } from './components/Navbar'
import { Sidebar } from './components/Sidebar'
import { ActivityLog } from './components/ActivityLog'
import { AuthDialog } from './components/AuthDialog'

import { Dashboard } from './pages/Dashboard'
import { History } from './pages/History'
import { Settings } from './pages/Settings'

import { useDownloadStore } from './store/downloadStore'

export function App(): JSX.Element {
  const { activePage, theme } = useDownloadStore()

  // Sync Tailwind dark class with persisted theme on startup
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <div className="flex flex-col h-screen bg-background text-white overflow-hidden font-sans">
      {/* ── Top navigation ─────────────────────────────────────────────── */}
      <Navbar />

      {/* ── Body: sidebar + main content + activity panel ──────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <Sidebar />

        {/* Main content with animated page transitions */}
        <main className="flex-1 overflow-hidden flex">
          <AnimatePresence mode="wait">
            {activePage === 'dashboard' && <Dashboard key="dashboard" />}
            {activePage === 'history' && <History key="history" />}
            {activePage === 'settings' && <Settings key="settings" />}
          </AnimatePresence>
        </main>

        {/* Right activity log panel */}
        <ActivityLog />
      </div>

      {/* ── Global overlays ─────────────────────────────────────────────── */}
      <AuthDialog />

      {/* ── Toast notifications ─────────────────────────────────────────── */}
      <Toaster
        position="bottom-right"
        gutter={8}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1E293B',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            fontSize: '13px',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 500,
            padding: '10px 14px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  )
}
