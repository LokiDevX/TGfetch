/**
 * src/pages/Dashboard.tsx
 *
 * Main download interface.
 *
 * Responsibilities:
 *   - Connect to Telegram via IPC (gramjs)
 *   - Accept credentials (API ID, API Hash, Channel ID)
 *   - Select download folder
 *   - Initiate / cancel download
 *   - Stream progress to the UI via IPC listeners
 *   - Feed activity log
 *
 * Business logic is isolated in the useDownloadManager hook defined below.
 * The JSX strictly focuses on layout and presentation.
 */

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Download,
  Plug,
  StopCircle,
  Wifi,
  WifiOff,
  Radio,
  TrendingUp,
  Clock,
  Folder,
  ArrowRight,
  QrCode,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { useDownloadStore } from '../store/downloadStore'
import type { DownloadStatus } from '../types/global'

// ─── useDownloadManager hook ─────────────────────────────────────────────────
// Encapsulates all IPC interactions, keeping JSX clean.

function useDownloadManager() {
  const {
    credentials,
    setCredentials,
    progress,
    setProgress,
    resetProgress,
    addLog,
    auth,
    setAuth,
    setAuthView,
    setAuthModalOpen,
    setActivityLogOpen,
  } = useDownloadStore()

  // ── Try to restore a saved session on mount ───────────────────────────────
  useEffect(() => {
    async function tryRestore(): Promise<void> {
      const has = await window.tgfetch.auth.hasSession()
      if (has) {
        const result = await window.tgfetch.auth.restoreSession()
        if (result.success) {
          const status = await window.tgfetch.auth.getStatus()
          setAuth(status)
          addLog({ type: 'success', message: 'Session restored – ready to download.' })
        }
      } else {
        const status = await window.tgfetch.auth.getStatus()
        setAuth(status)
      }
    }
    tryRestore()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Register auth status listener ─────────────────────────────────────────
  useEffect(() => {
    const unsubAuth = window.tgfetch.auth.onStatusChange((payload) => {
      setAuth(payload)
      
      // Log status changes
      if (payload.status === 'authenticated') {
        addLog({ type: 'success', message: `Connected to Telegram${payload.phoneNumber ? ' as ' + payload.phoneNumber : ''}` })
        toast.success('Successfully connected to Telegram!')
      } else if (payload.status === 'error' && payload.error) {
        addLog({ type: 'error', message: `Auth error: ${payload.error}` })
        toast.error(`Authentication error: ${payload.error}`)
      }
    })
    
    return () => {
      unsubAuth()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // ── Register IPC download listeners ──────────────────────────────────────
  useEffect(() => {
    const activeFiles = new Map<string, { downloaded: number; total: number }>();
    let lastTotalBytes = 0;

    const speedInterval = setInterval(() => {
      let currentTotalBytes = 0;
      let currentTotalSize = 0;
      activeFiles.forEach(({ downloaded, total }) => {
        currentTotalBytes += downloaded;
        currentTotalSize += total;
      });

      const diff = currentTotalBytes - lastTotalBytes;
      if (lastTotalBytes !== 0 && diff >= 0) {
        const speed = diff; // bytes per second
        
        // Calculate ETA based on remaining bytes of currently active files
        const remainingBytes = currentTotalSize - currentTotalBytes;
        const eta = speed > 0 ? remainingBytes / speed : 0;

        useDownloadStore.getState().setProgress({ speed, eta });
      }
      lastTotalBytes = currentTotalBytes;
    }, 1000);

    const unsubStatus = window.tgfetch.download.onStatus(({ status, message }) => {
      if (status) setProgress({ status: status as DownloadStatus });
      if (message) {
        setProgress({ statusMessage: message });
        addLog({ type: 'info', message });
      }
    });

    const unsubTotal = window.tgfetch.download.onTotal(({ total }) => {
      setProgress({ total });
      addLog({ type: 'info', message: `Found ${total.toLocaleString()} media files.` });
    });

    const unsubFileStart = window.tgfetch.download.onFileStart(({ fileName }) => {
      activeFiles.set(fileName, { downloaded: 0, total: 0 });
      setProgress({ currentFile: fileName, currentFilePercent: 0, currentFileDownloaded: 0, currentFileSize: 0 });
    });

    const unsubFileProgress = window.tgfetch.download.onFileProgress(({ fileName, percent, downloadedBytes, totalBytes }) => {
      activeFiles.set(fileName, { downloaded: downloadedBytes, total: totalBytes });
      setProgress({ 
        currentFile: fileName,
        currentFilePercent: percent,
        currentFileDownloaded: downloadedBytes,
        currentFileSize: totalBytes
      });
    });

    const unsubFileComplete = window.tgfetch.download.onFileComplete(({ fileName, downloaded, total, percent }) => {
      activeFiles.delete(fileName);
      setProgress({ downloaded, percent, currentFile: '' });
      addLog({ type: 'success', fileName, message: `Downloaded successfully` });
      void total; // suppress unused warning
    });

    const unsubFileError = window.tgfetch.download.onFileError(({ fileName, error }) => {
      activeFiles.delete(fileName);
      addLog({ type: 'error', fileName, message: error });
    });

    const unsubComplete = window.tgfetch.download.onComplete(({ downloaded, total, errors, status, totalSize, durationMs, averageSpeed }) => {
      activeFiles.clear();
      lastTotalBytes = 0;
      setProgress({ status: status as DownloadStatus, downloaded, total, percent: 100, statusMessage: '', totalSize, durationMs, averageSpeed });
      if (status === 'completed') {
        toast.success(`Downloaded ${downloaded.toLocaleString()} files successfully!`);
        addLog({ type: 'success', message: `All ${downloaded.toLocaleString()} files downloaded!` });
      } else {
        toast(
          `Finished with ${errors} error${errors !== 1 ? 's' : ''}. ${downloaded} / ${total} downloaded.`,
          { icon: '⚠️' }
        );
      }
    });

    const unsubError = window.tgfetch.download.onError(({ error }) => {
      activeFiles.clear();
      lastTotalBytes = 0;
      setProgress({ status: 'error', statusMessage: error });
      toast.error(`Download failed: ${error}`);
      addLog({ type: 'error', message: `Download failed: ${error}` });
    });

    return () => {
      clearInterval(speedInterval);
      unsubStatus();unsubStatus()
      unsubTotal()
      unsubFileStart()
      unsubFileProgress()
      unsubFileComplete()
      unsubFileError()
      unsubComplete()
      unsubError()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Connect ───────────────────────────────────────────────────────────────
  const handleConnect = useCallback(async () => {
    addLog({ type: 'info', message: 'Initiating Telegram connection…' })

    const result = await window.tgfetch.auth.connect()

    if (!result.success && result.error) {
      toast.error(result.error)
      addLog({ type: 'error', message: result.error })
    }
  }, [addLog])

  // ── Connect with QR ───────────────────────────────────────────────────────
  const handleConnectQR = useCallback(async () => {
    addLog({ type: 'info', message: 'Initiating QR login…' })

    // Show QR view in modal first
    try {
      setAuthView('qr')
      setAuthModalOpen(true)
    } catch {
      // ignore if store not ready
    }

    const result = await window.tgfetch.auth.connectWithQR()

    if (!result.success && result.error) {
      toast.error(result.error)
      addLog({ type: 'error', message: result.error })
    }
  }, [addLog])

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = useCallback(async () => {
    await window.tgfetch.auth.logout()
    toast.success('Logged out successfully')
    addLog({ type: 'info', message: 'Logged out from Telegram' })
  }, [addLog])

  // ── Start download ────────────────────────────────────────────────────────
  const handleStartDownload = useCallback(async () => {
    if (!credentials.channelId) {
      toast.error('Channel ID is required.')
      return
    }
    if (!credentials.downloadPath) {
      toast.error('Please select a download folder.')
      return
    }

    resetProgress()
    setProgress({ status: 'running', statusMessage: 'Initializing…' })
    setActivityLogOpen(true)
    addLog({ type: 'info', message: `Starting download from @${credentials.channelId}` })

    const result = await window.tgfetch.download.start({
      channelId: credentials.channelId,
      downloadPath: credentials.downloadPath,
    })

    if (!result.success && result.error) {
      setProgress({ status: 'error', statusMessage: result.error })
    }
  }, [credentials.channelId, credentials.downloadPath]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cancel download ───────────────────────────────────────────────────────
  const handleCancelDownload = useCallback(async () => {
    await window.tgfetch.download.cancel()
    setProgress({ status: 'cancelled', statusMessage: 'Cancelled by user.' })
    addLog({ type: 'warning', message: 'Download cancelled by user.' })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { 
    handleConnect,
    handleConnectQR,
    handleLogout, 
    handleStartDownload, 
    handleCancelDownload, 
    auth, 
    progress, 
    credentials, 
    setCredentials 
  }
}

// ─── Dashboard Page ──────────────────────────────────────────────────────────

export function Dashboard(): JSX.Element {
  const {
    handleConnect,
    handleConnectQR,
    handleLogout,
    auth,
    progress,
  } = useDownloadManager()

  const { setActivePage, history, channels } = useDownloadStore()

  const isAuthenticated = auth.status === 'authenticated'
  const isConnecting = auth.status === 'connecting' || 
                       auth.status === 'restoring' ||
                       auth.status === 'qr_waiting' ||
                       auth.status === 'waiting_for_phone' ||
                       auth.status === 'waiting_for_code' ||
                       auth.status === 'waiting_for_password'

  // Calculate stats
  const totalChannels = channels.length
  const recentDownloads = history.filter(h => h.status === 'completed').slice(0, 3)
  const lastDownload = recentDownloads[0]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="flex-1 overflow-y-auto relative"
    >
      <div className="max-w-6xl mx-auto p-8 space-y-8">
        {/* ── Hero header ──────────────────────────────────────────────── */}
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-4xl font-extrabold text-white tracking-tight"
          >
            Your Telegram Media
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-base font-medium text-white/50 mt-2"
          >
            Browse channels, select media, and download with ease
          </motion.p>
        </div>

        {/* ── Connection Card ──────────────────────────────────────────── */}
        {!isAuthenticated && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="bg-gradient-to-br from-accent-blue/10 to-accent-cyan/10 border border-accent-blue/30 rounded-2xl p-8"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-2">Connect to Telegram</h2>
                <p className="text-white/60 text-sm mb-6">
                  Scan a QR code or use your phone number to access your channels
                </p>

                <div className="flex items-center gap-3">
                  <motion.button
                    whileHover={!isConnecting ? { scale: 1.02 } : {}}
                    whileTap={!isConnecting ? { scale: 0.98 } : {}}
                    onClick={handleConnectQR}
                    disabled={isConnecting}
                    className={`
                      px-6 py-3 rounded-xl flex items-center gap-2.5 text-sm font-semibold
                      transition-all duration-200
                      ${isConnecting
                        ? 'bg-white/10 text-white/40 cursor-not-allowed'
                        : 'bg-gradient-to-r from-accent-blue to-accent-cyan text-white shadow-glow-blue hover:shadow-glow-cyan'
                      }
                    `}
                  >
                    {isConnecting && auth.status === 'qr_waiting' ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                        Waiting for scan...
                      </>
                    ) : (
                      <>
                        <QrCode className="w-5 h-5" />
                        Login with QR
                      </>
                    )}
                  </motion.button>

                  <motion.button
                    whileHover={!isConnecting ? { scale: 1.02 } : {}}
                    whileTap={!isConnecting ? { scale: 0.98 } : {}}
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-all"
                  >
                    Use Phone Number
                  </motion.button>
                </div>
              </div>
              
              <div className="hidden lg:block">
                <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-accent-blue/20 to-accent-cyan/20 flex items-center justify-center">
                  <Wifi className="w-16 h-16 text-accent-blue" />
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {/* ── Stats Cards ─────────────────────────────────────────────── */}
        {isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {/* Total Channels */}
            <div className="bg-background-card border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-blue/20 to-accent-cyan/20 flex items-center justify-center">
                  <Radio className="w-6 h-6 text-accent-blue" />
                </div>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-3xl font-bold text-white mb-1">{totalChannels}</p>
              <p className="text-sm text-white/50">Total Channels</p>
            </div>

            {/* Total Downloads */}
            <div className="bg-background-card border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                  <Download className="w-6 h-6 text-purple-400" />
                </div>
              </div>
              <p className="text-3xl font-bold text-white mb-1">
                {history.reduce((sum, h) => sum + h.downloadedFiles, 0)}
              </p>
              <p className="text-sm text-white/50">Files Downloaded</p>
            </div>

            {/* Last Download */}
            <div className="bg-background-card border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-orange-400" />
                </div>
              </div>
              <p className="text-xl font-bold text-white mb-1 truncate">
                {lastDownload ? new Date(lastDownload.completedAt).toLocaleDateString() : 'Never'}
              </p>
              <p className="text-sm text-white/50">Last Download</p>
            </div>
          </motion.div>
        )}

        {/* ── Quick Actions ────────────────────────────────────────────── */}
        {isAuthenticated && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="bg-background-card border border-white/10 rounded-2xl p-8"
          >
            <h2 className="text-lg font-semibold text-white mb-6">Quick Actions</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Browse Channels */}
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActivePage('channels')}
                className="group relative overflow-hidden bg-gradient-to-br from-accent-blue/10 to-accent-cyan/10 hover:from-accent-blue/20 hover:to-accent-cyan/20 border border-accent-blue/30 rounded-xl p-6 text-left transition-all"
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center shadow-glow-blue">
                      <Radio className="w-6 h-6 text-white" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-accent-blue group-hover:translate-x-1 transition-transform" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">Browse Channels</h3>
                  <p className="text-sm text-white/60">View all your joined channels and their media</p>
                </div>
              </motion.button>

              {/* View History */}
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActivePage('history')}
                className="group relative overflow-hidden bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-6 text-left transition-all"
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-purple-400" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-white/40 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">View History</h3>
                  <p className="text-sm text-white/60">Browse your past downloads and sessions</p>
                </div>
              </motion.button>
            </div>
          </motion.section>
        )}

        {/* ── Recent Downloads ────────────────────────────────────────── */}
        {isAuthenticated && recentDownloads.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="bg-background-card border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Recent Downloads</h2>
              <button
                onClick={() => setActivePage('history')}
                className="text-xs text-accent-blue hover:text-accent-cyan transition-colors"
              >
                View All
              </button>
            </div>

            <div className="space-y-2">
              {recentDownloads.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 flex items-center justify-center">
                    <Download className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{item.channelId}</p>
                    <p className="text-xs text-white/40">
                      {item.downloadedFiles} files • {new Date(item.completedAt).toLocaleString()}
                    </p>
                  </div>
                  <Folder className="w-5 h-5 text-white/30" />
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* ── Connected Status (bottom) ───────────────────────────────── */}
        {isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.20 }}
            className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30"
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-sm text-emerald-400 font-medium">
                Connected to Telegram
                {auth.phoneNumber && <span className="text-white/50 ml-2">• {auth.phoneNumber}</span>}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 transition-all"
            >
              Logout
            </button>
          </motion.div>
        )}

        {/* Subtle brand watermark */}
        <div className="absolute bottom-6 right-6 text-white/5 text-6xl font-bold pointer-events-none select-none">
          LOKI
        </div>
      </div>
    </motion.div>
  )
}
