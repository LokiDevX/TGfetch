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
  Eye,
  EyeOff,
  StopCircle,
  Wifi,
  WifiOff,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { useDownloadStore } from '../store/downloadStore'
import { InputField } from '../components/InputField'
import { FolderSelector } from '../components/FolderSelector'
import { ProgressBar } from '../components/ProgressBar'
import { DownloadSummary } from '../components/DownloadSummary'
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
    setShowAuthDialog,
    setActivityLogOpen,
  } = useDownloadStore()

  // ── Try to restore a saved session on mount ───────────────────────────────
  useEffect(() => {
    async function tryRestore(): Promise<void> {
      const has = await window.tgfetch.auth.hasSession()
      if (has) {
        const result = await window.tgfetch.auth.restoreSession()
        if (result.success) {
          setAuth({ isAuthenticated: true })
          addLog({ type: 'success', message: 'Session restored – ready to download.' })
        }
      }
    }
    tryRestore()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Register IPC auth listeners ───────────────────────────────────────────
  useEffect(() => {
    const unsubPhone = window.tgfetch.auth.onRequestPhone(() => {
      setAuth({ pendingAction: 'phone' })
      setShowAuthDialog(true)
    })
    const unsubCode = window.tgfetch.auth.onRequestCode(() => {
      setAuth({ pendingAction: 'code' })
      setShowAuthDialog(true)
    })
    const unsubPwd = window.tgfetch.auth.onRequestPassword(() => {
      setAuth({ pendingAction: 'password' })
      setShowAuthDialog(true)
    })
    const unsubAuthErr = window.tgfetch.auth.onError(({ message }) => {
      addLog({ type: 'error', message: `Auth error: ${message}` })
      toast.error(`Authentication error: ${message}`)
    })
    return () => {
      unsubPhone()
      unsubCode()
      unsubPwd()
      unsubAuthErr()
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
    if (!credentials.apiId || !credentials.apiHash) {
      toast.error('API ID and API Hash are required.')
      return
    }

    setAuth({ isConnecting: true })
    addLog({ type: 'info', message: 'Connecting to Telegram…' })

    const result = await window.tgfetch.auth.connect({
      apiId: credentials.apiId,
      apiHash: credentials.apiHash,
    })

    if (result.success) {
      setAuth({ isAuthenticated: true, isConnecting: false })
      toast.success('Connected to Telegram!')
      addLog({ type: 'success', message: 'Connected to Telegram successfully.' })
    } else {
      setAuth({ isConnecting: false })
      toast.error(result.error ?? 'Connection failed.')
      addLog({ type: 'error', message: result.error ?? 'Connection failed.' })
    }
  }, [credentials.apiId, credentials.apiHash]) // eslint-disable-line react-hooks/exhaustive-deps

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

  return { handleConnect, handleStartDownload, handleCancelDownload, auth, progress, credentials, setCredentials }
}

// ─── Dashboard Page ──────────────────────────────────────────────────────────

export function Dashboard(): JSX.Element {
  const [showApiHash, setShowApiHash] = useState(false)
  const {
    handleConnect,
    handleStartDownload,
    handleCancelDownload,
    auth,
    progress,
    credentials,
    setCredentials,
  } = useDownloadManager()

  const isRunning = progress.status === 'running'
  const canDownload = auth.isAuthenticated && !isRunning

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="flex-1 overflow-y-auto p-6 space-y-6 max-w-2xl mx-auto w-full"
    >
      {/* ── Hero header ──────────────────────────────────────────────── */}
      <div>
        <motion.h1
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-3xl font-extrabold text-white tracking-tight"
        >
          Download Telegram Channel Media
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-sm font-medium text-white/50 mt-1.5"
        >
          Securely fetch and store all videos from your channel
        </motion.p>
      </div>

      {/* ── Connection status badge ────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className={`
          inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border
          ${auth.isAuthenticated
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-white/5 border-white/10 text-white/40'
          }
        `}
      >
        {auth.isAuthenticated ? (
          <><Wifi className="w-3 h-3" /> Connected to Telegram</>
        ) : (
          <><WifiOff className="w-3 h-3" /> Not connected</>
        )}
      </motion.div>

      {/* ── Credentials card ─────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="bg-background-card border border-white/10 rounded-2xl p-5 space-y-4"
      >
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-sm font-semibold text-white/80">API Credentials</h2>
          <span className="text-[10px] text-white/30 bg-white/5 px-2 py-0.5 rounded-full">
            From my.telegram.org
          </span>
        </div>

        {/* API ID */}
        <InputField
          label="API ID"
          value={credentials.apiId}
          onChange={(v) => setCredentials({ apiId: v })}
          type="number"
          disabled={auth.isAuthenticated || auth.isConnecting}
          hint="Numeric API ID from Telegram developer portal"
          autoComplete="off"
        />

        {/* API Hash */}
        <InputField
          label="API Hash"
          value={credentials.apiHash}
          onChange={(v) => setCredentials({ apiHash: v })}
          type={showApiHash ? 'text' : 'password'}
          disabled={auth.isAuthenticated || auth.isConnecting}
          hint="32-character hex string from Telegram developer portal"
          autoComplete="off"
          rightSlot={
            <button
              onClick={() => setShowApiHash(!showApiHash)}
              className="text-white/30 hover:text-white/60 transition-colors"
              tabIndex={-1}
            >
              {showApiHash ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
        />

        {/* Connect button */}
        {!auth.isAuthenticated && (
          <motion.button
            whileHover={!auth.isConnecting ? { scale: 1.01 } : {}}
            whileTap={!auth.isConnecting ? { scale: 0.98 } : {}}
            onClick={handleConnect}
            disabled={auth.isConnecting || !credentials.apiId || !credentials.apiHash}
            className={`
              w-full py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold
              transition-all duration-200
              ${auth.isConnecting || !credentials.apiId || !credentials.apiHash
                ? 'bg-white/5 text-white/25 cursor-not-allowed'
                : 'bg-white/10 hover:bg-white/15 text-white border border-white/15 hover:border-white/25'
              }
            `}
          >
            {auth.isConnecting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                Connecting…
              </>
            ) : (
              <>
                <Plug className="w-4 h-4" />
                Connect to Telegram
              </>
            )}
          </motion.button>
        )}
      </motion.section>

      {/* ── Download config card ──────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className="bg-background-card border border-white/10 rounded-2xl p-5 space-y-4"
      >
        <h2 className="text-sm font-semibold text-white/80">Download Configuration</h2>

        {/* Channel ID */}
        <InputField
          label="Channel ID"
          value={credentials.channelId}
          onChange={(v) => setCredentials({ channelId: v })}
          type="text"
          disabled={isRunning}
          hint='Username (e.g. "mychannelname") or numeric ID'
          autoComplete="off"
        />

        {/* Folder selector */}
        <FolderSelector
          path={credentials.downloadPath}
          onChange={(p) => setCredentials({ downloadPath: p })}
          disabled={isRunning}
        />
      </motion.section>

      {/* ── Progress card (visible when not idle) ────────────────────── */}
      {progress.status !== 'idle' && progress.status !== 'completed' && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-background-card border border-white/10 rounded-2xl p-5"
        >
          <ProgressBar
            percent={progress.percent}
            downloaded={progress.downloaded}
            total={progress.total}
            status={progress.status}
            statusMessage={progress.statusMessage}
            currentFile={progress.currentFile}
            currentFileSize={progress.currentFileSize}
            currentFileDownloaded={progress.currentFileDownloaded}
            speed={progress.speed}
            eta={progress.eta}
          />
        </motion.section>
      )}

      {/* ── Summary Card ──────────────────────────────────────────────── */}
      {progress.status === 'completed' && (
        <DownloadSummary
          totalFiles={progress.total}
          totalSize={progress.totalSize}
          durationMs={progress.durationMs}
          averageSpeed={progress.averageSpeed}
          onDismiss={() => useDownloadStore.getState().setProgress({ status: 'idle' })}
        />
      )}

      {/* ── Primary action button ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
      >
        {isRunning ? (
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCancelDownload}
            className="w-full py-3.5 rounded-xl flex items-center justify-center gap-2.5 text-sm font-bold
                       bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50
                       text-red-400 transition-all duration-200"
          >
            <StopCircle className="w-5 h-5" />
            Cancel Download
          </motion.button>
        ) : (
          <motion.button
            whileHover={canDownload ? { scale: 1.01 } : {}}
            whileTap={canDownload ? { scale: 0.98 } : {}}
            onClick={handleStartDownload}
            disabled={!canDownload}
            className={`
              w-full py-3.5 rounded-xl flex items-center justify-center gap-2.5 text-sm font-bold
              transition-all duration-300
              ${canDownload
                ? 'bg-gradient-to-r from-accent-blue to-accent-cyan text-white shadow-glow-blue hover:shadow-glow-cyan hover:brightness-110'
                : 'bg-white/5 text-white/20 cursor-not-allowed'
              }
            `}
          >
            <Download className="w-5 h-5" />
            Start Download
          </motion.button>
        )}

        {!auth.isAuthenticated && (
          <p className="text-center text-xs text-white/25 mt-2">
            Connect to Telegram first to enable downloads
          </p>
        )}
      </motion.div>
    </motion.div>
  )
}
