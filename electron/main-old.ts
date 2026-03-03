/**
 * electron/main.ts
 *
 * Electron main process – responsible for:
 *   1. Creating the BrowserWindow
 *   2. Registering all IPC handlers (download, auth, history, etc.)
 *   3. Managing the Telegram gramjs client lifecycle
 *
 * Architecture: All Telegram / Node.js logic lives here.
 * The renderer (React) communicates exclusively through the contextBridge
 * exposed in preload.ts — never via direct Node access.
 */

import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  nativeTheme,
} from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { TelegramClient, sessions, errors } from 'telegram'
const { StringSession } = sessions
import type { Api } from 'telegram'

// ─── Constants ─────────────────────────────────────────────────────────────

const IS_DEV = process.env.NODE_ENV === 'development'
const USER_DATA = app.getPath('userData')
const SESSION_FILE = path.join(USER_DATA, 'session.json')
const HISTORY_FILE = path.join(USER_DATA, 'history.json')

/**
 * 🔐 SECURITY: API credentials are hardcoded here and NEVER exposed to renderer.
 * These credentials are used exclusively in the main process for Telegram authentication.
 * 
 * ⚠️ IMPORTANT: Replace these with your actual Telegram API credentials from:
 * https://my.telegram.org/apps
 */
const API_ID = 35192275
const API_HASH = '482ac56d21bfe3d66572d1727116afe9'

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * Auth state machine states
 */
type AuthStatus = 
  | 'idle'                    // Not connected, no session
  | 'restoring'               // Attempting to restore saved session
  | 'connecting'              // Initiating new connection
  | 'waiting_for_phone'       // Waiting for user to enter phone number
  | 'waiting_for_code'        // Waiting for OTP code
  | 'waiting_for_password'    // Waiting for 2FA password
  | 'authenticated'           // Successfully authenticated
  | 'error'                   // Error occurred

interface SessionData {
  session: string              // StringSession save string
  phoneNumber?: string         // For display purposes only
}

interface HistoryEntry {
  id: string
  channelId: string
  downloadPath: string
  totalFiles: number
  downloadedFiles: number
  status: 'completed' | 'error' | 'partial'
  startedAt: string
  completedAt: string
  errorMessage?: string
}

// ─── Auth State Machine ─────────────────────────────────────────────────────

/**
 * Centralized authentication state
 */
let authStatus: AuthStatus = 'idle'
let activeClient: TelegramClient | null = null
let isDownloading = false
let phoneNumber: string = ''

// Callback resolvers for interactive auth prompts
let phoneResolver: ((phone: string) => void) | null = null
let codeResolver: ((code: string) => void) | null = null
let passwordResolver: ((password: string) => void) | null = null

// ─── Window ─────────────────────────────────────────────────────────────────

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 620,
    backgroundColor: '#020617',
    frame: false,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
    icon: path.join(app.getAppPath(), IS_DEV ? 'public' : 'dist', 'icon.png'),
  })

  // Graceful show after load to avoid white flash
  win.once('ready-to-show', () => {
    win.show()
  })

  if (IS_DEV) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  return win
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Update auth status and notify renderer
 */
function setAuthStatus(status: AuthStatus, error?: string): void {
  authStatus = status
  const win = getBrowserWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send('auth-status', { 
      status, 
      error,
      phoneNumber: phoneNumber || undefined
    })
  }
}

function readSessionFile(): SessionData | null {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      const raw = fs.readFileSync(SESSION_FILE, 'utf-8')
      return JSON.parse(raw) as SessionData
    }
  } catch {
    // Corrupt session file – ignore and return null
  }
  return null
}

function writeSessionFile(data: SessionData): void {
  fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true })
  fs.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

function deleteSessionFile(): void {
  if (fs.existsSync(SESSION_FILE)) {
    fs.unlinkSync(SESSION_FILE)
  }
}

function readHistory(): HistoryEntry[] {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const raw = fs.readFileSync(HISTORY_FILE, 'utf-8')
      return JSON.parse(raw) as HistoryEntry[]
    }
  } catch {
    // ignore
  }
  return []
}

function appendHistory(entry: HistoryEntry): void {
  const history = readHistory()
  history.unshift(entry) // newest first
  const trimmed = history.slice(0, 200) // keep max 200 entries
  fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true })
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2), 'utf-8')
}

function getBrowserWindow(): BrowserWindow | undefined {
  return BrowserWindow.getAllWindows()[0]
}

function normalizeChannel(input: string): string | number {
  const trimmed = input.trim()   // remove spaces

  // If numeric ID like -1002628823561
  if (/^-?\d+$/.test(trimmed)) {
    return Number(trimmed)
  }

  // If full t.me link
  if (trimmed.includes("t.me/")) {
    const parts = trimmed.split("t.me/")[1]

    if (parts.startsWith("c/")) {
      const id = parts.replace("c/", "")
      return Number("-100" + id)
    }

    return "@" + parts.replace("/", "")
  }

  // If username without @
  if (!trimmed.startsWith("@")) {
    return "@" + trimmed
  }

  return trimmed
}

/**
 * Send a progress event to the renderer safely.
 */
function sendProgress(event: string, payload: unknown): void {
  const win = getBrowserWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send(event, payload)
  }
}

// ─── IPC Handlers ───────────────────────────────────────────────────────────

/**
 * AUTH: Get current authentication status.
 */
ipcMain.handle('auth:getStatus', (): { status: AuthStatus; phoneNumber?: string } => {
  return { 
    status: authStatus,
    phoneNumber: phoneNumber || undefined
  }
})

/**
 * AUTH: Check if a saved session exists.
 */
ipcMain.handle('auth:hasSession', (): boolean => {
  return readSessionFile() !== null
})

/**
 * AUTH: Restore a previously saved session (auto-connect on app start).
 */
ipcMain.handle('auth:restoreSession', async (): Promise<{ success: boolean; error?: string }> => {
  const saved = readSessionFile()
  if (!saved) {
    setAuthStatus('idle')
    return { success: false, error: 'No saved session.' }
  }

  try {
    setAuthStatus('restoring')
    const stringSession = new StringSession(saved.session)
    const client = new TelegramClient(stringSession, API_ID, API_HASH, {
      connectionRetries: 3,
    })
    
    await client.connect()
    
    // Verify the session is still valid by getting user info
    const me = await client.getMe()
    if (me) {
      activeClient = client
      phoneNumber = saved.phoneNumber || ''
      setAuthStatus('authenticated')
      return { success: true }
    } else {
      throw new Error('Invalid session')
    }
  } catch (err) {
    // Session is invalid, clean up
    deleteSessionFile()
    setAuthStatus('idle', 'Session expired. Please login again.')
    const error = err instanceof Error ? err.message : String(err)
    return { success: false, error }
  }
})

/**
 * AUTH: Initiate new Telegram connection (called when user clicks "Connect Telegram").
 * This starts the interactive login flow with phone/code/password prompts.
 */
ipcMain.handle('auth:connect', async (): Promise<{ success: boolean; error?: string }> => {
  try {
    // Disconnect existing client if any
    if (activeClient) {
      await activeClient.disconnect()
      activeClient = null
    }

    setAuthStatus('connecting')
    
    const stringSession = new StringSession('')
    const client = new TelegramClient(stringSession, API_ID, API_HASH, {
      connectionRetries: 3,
    })

    // Start interactive authentication
    await client.start({
      phoneNumber: async () => {
        return new Promise<string>((resolve) => {
          setAuthStatus('waiting_for_phone')
          phoneResolver = (phone: string) => {
            phoneNumber = phone
            resolve(phone)
          }
        })
      },
      password: async () => {
        return new Promise<string>((resolve) => {
          setAuthStatus('waiting_for_password')
          passwordResolver = (pwd: string) => {
            resolve(pwd)
          }
        })
      },
      phoneCode: async () => {
        return new Promise<string>((resolve) => {
          setAuthStatus('waiting_for_code')
          codeResolver = (code: string) => {
            resolve(code)
          }
        })
      },
      onError: (err: Error) => {
        setAuthStatus('error', err.message)
      },
    })

    // Save session after successful authentication
    const sessionString = client.session.save() as unknown as string
    writeSessionFile({ 
      session: sessionString,
      phoneNumber: phoneNumber
    })

    activeClient = client
    setAuthStatus('authenticated')
    
    return { success: true }
  } catch (err) {
    setAuthStatus('error', err instanceof Error ? err.message : String(err))
    const error = err instanceof Error ? err.message : String(err)
    return { success: false, error }
  }
})

/**
 * AUTH: Submit phone number (response to waiting_for_phone state).
 */
ipcMain.handle('auth:submitPhone', (_event, phone: string): void => {
  if (phoneResolver) {
    phoneResolver(phone)
    phoneResolver = null
  }
})

/**
 * AUTH: Submit verification code (response to waiting_for_code state).
 */
ipcMain.handle('auth:submitCode', (_event, code: string): void => {
  if (codeResolver) {
    codeResolver(code)
    codeResolver = null
  }
})

/**
 * AUTH: Submit 2FA password (response to waiting_for_password state).
 */
ipcMain.handle('auth:submitPassword', (_event, password: string): void => {
  if (passwordResolver) {
    passwordResolver(password)
    passwordResolver = null
  }
})

/**
 * AUTH: Logout – disconnect and remove saved session.
 */
ipcMain.handle('auth:logout', async (): Promise<void> => {
  if (activeClient) {
    try {
      await activeClient.invoke(
        new (await import('telegram/tl')).Api.auth.LogOut()
      )
      await activeClient.disconnect()
    } catch (err) {
      console.error('Logout error:', err)
      // Continue with cleanup even if logout fails
    }
    activeClient = null
  }
  
  deleteSessionFile()
  phoneNumber = ''
  setAuthStatus('idle')
})

/**
 * DIALOG: Open native folder picker.
 */
ipcMain.handle('dialog:openFolder', async (): Promise<string | null> => {
  const win = getBrowserWindow()
  if (!win) return null

  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Download Folder',
    buttonLabel: 'Select Folder',
  })

  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

/**
 * DOWNLOAD: Start downloading videos from a Telegram channel.
 * Emits real-time progress events to the renderer.
 */
ipcMain.handle(
  'download:start',
  async (
    _event,
    { channelId, downloadPath }: { channelId: string; downloadPath: string }
  ): Promise<{ success: boolean; error?: string }> => {
    if (isDownloading) {
      return { success: false, error: 'A download is already in progress.' }
    }

    if (!activeClient) {
      return { success: false, error: 'Not authenticated. Please connect first.' }
    }

    isDownloading = true
    const startedAt = new Date().toISOString()
    let totalFiles = 0
    let downloadedFiles = 0
    let totalDownloadedBytes = 0
    let errorCount = 0
    const historyId = `dl-${Date.now()}`

    sendProgress('download:status', { status: 'running', message: 'Fetching channel info…' })

    try {
      console.log("Channel ID received:", channelId)
      const targetChannel = normalizeChannel(channelId)

      // Resolve the entity
      const entity = await activeClient.getEntity(targetChannel)
      console.log("Resolved entity:", entity.id)

      // Iterate all messages to find video messages
      sendProgress('download:status', { status: 'running', message: 'Scanning messages for media…' })

      const videoMessages: Api.Message[] = []

      for await (const message of activeClient.iterMessages(entity, { limit: undefined })) {
        const msg = message as Api.Message
        if (msg.media) {
          const media = msg.media
          // Check for document (video) or photo
          const isVideo =
            'className' in media &&
            (media.className === 'MessageMediaDocument' || media.className === 'MessageMediaPhoto')

          if (isVideo) {
            videoMessages.push(msg)
          }
        }
      }

      totalFiles = videoMessages.length
      sendProgress('download:total', { total: totalFiles })
      sendProgress('download:status', {
        status: 'running',
        message: `Found ${totalFiles} media files. Starting download…`,
      })

      // Ensure output directory exists
      fs.mkdirSync(downloadPath, { recursive: true })

      // Download with concurrency limit of 5 to optimize Telegram
      const CONCURRENCY = 5
      const queue = [...videoMessages]

      async function worker(q: Api.Message[]): Promise<void> {
        while (q.length) {
          if (!isDownloading) break // Exit if cancelled

          const msg = q.shift()
          if (!msg) break

          const msgId = msg.id

          let fileName = `file_${msgId}`
          if (
            msg.media &&
            'document' in msg.media &&
            msg.media.document &&
            'attributes' in msg.media.document
          ) {
            const doc = msg.media.document as Api.Document
            const attr = doc.attributes.find((a) => a.className === 'DocumentAttributeFilename') as
              | Api.DocumentAttributeFilename
              | undefined
            if (attr?.fileName) {
              fileName = attr.fileName
            } else {
              const mimeAttr = doc.mimeType ?? 'video/mp4'
              const ext = mimeAttr.split('/')[1] ?? 'bin'
              fileName = `media_${msgId}.${ext}`
            }
          } else {
            fileName = `photo_${msgId}.jpg`
          }

          const filePath = path.join(downloadPath, fileName)
          sendProgress('download:fileStart', { fileName, fileIndex: downloadedFiles + 1, total: totalFiles })

          let success = false
          let retryCount = 0

          while (!success && retryCount < 5 && isDownloading) {
            try {
              const buffer = (await activeClient!.downloadMedia(msg, {
                progressCallback: (downloaded: unknown, total: unknown) => {
                  const dl = Number(downloaded)
                  const tot = Number(total)
                  const pct = tot > 0 ? Math.round((dl / tot) * 100) : 0
                  sendProgress('download:fileProgress', { fileName, percent: pct, downloadedBytes: dl, totalBytes: tot })
                },
              })) as Buffer | undefined

              if (buffer) {
                fs.writeFileSync(filePath, buffer)
            totalDownloadedBytes += buffer.length
            totalDownloadedBytes += buffer.length
              }
              success = true

              downloadedFiles++
              sendProgress('download:fileComplete', {
                fileName,
                downloaded: downloadedFiles,
                total: totalFiles,
        totalDownloadedBytes,
                percent: Math.round((downloadedFiles / totalFiles) * 100),
              })
            } catch (fileErr) {
              if (fileErr instanceof errors.FloodWaitError) {
                const waitSeconds = fileErr.seconds
                console.warn(`Flood wait! Sleeping for ${waitSeconds} seconds...`)
                sendProgress('download:status', { status: 'running', message: `Telegram rate limit. Waiting ${waitSeconds}s...` })
                await new Promise((r) => setTimeout(r, waitSeconds * 1000 + 100))
                retryCount++
              } else {
                errorCount++
                const errMsg = fileErr instanceof Error ? fileErr.message : String(fileErr)
                sendProgress('download:fileError', { fileName, error: errMsg })
                break // Unrecoverable error, move to next file
              }
            }
          }

          if (!success && retryCount >= 5) {
            errorCount++
            sendProgress('download:fileError', { fileName, error: 'Too many flood wait errors. Giving up on file.' })
          }
        }
      }

      // Launch concurrent workers
      const workers = Array.from({ length: Math.min(CONCURRENCY, totalFiles) }, () => worker(queue))
      await Promise.all(workers)

      const status: HistoryEntry['status'] =
        errorCount === 0 ? 'completed' : downloadedFiles > 0 ? 'partial' : 'error'

      const completedAt = new Date().toISOString()

      appendHistory({
        id: historyId,
        channelId,
        downloadPath,
        totalFiles,
        downloadedFiles,
        status,
        startedAt,
        completedAt,
      })

      const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime()
      const averageSpeed = durationMs > 0 ? (totalDownloadedBytes / (durationMs / 1000)) : 0

      sendProgress('download:complete', {
        downloaded: downloadedFiles,
        total: totalFiles,
        errors: errorCount,
        status,
        totalSize: totalDownloadedBytes,
        durationMs,
        averageSpeed
      })

      isDownloading = false
      return { success: true }
    } catch (err) {
      isDownloading = false
      const error = err instanceof Error ? err.message : String(err)

      appendHistory({
        id: historyId,
        channelId,
        downloadPath,
        totalFiles,
        downloadedFiles,
        status: 'error',
        startedAt,
        completedAt: new Date().toISOString(),
        errorMessage: error,
      })

      sendProgress('download:error', { error })
      return { success: false, error }
    }
  }
)

/**
 * DOWNLOAD: Cancel an in-progress download.
 */
ipcMain.handle('download:cancel', async (): Promise<void> => {
  isDownloading = false
  sendProgress('download:status', { status: 'cancelled', message: 'Download cancelled by user.' })
})

/**
 * HISTORY: Return all download history entries.
 */
ipcMain.handle('history:get', (): HistoryEntry[] => {
  return readHistory()
})

/**
 * HISTORY: Clear all download history.
 */
ipcMain.handle('history:clear', (): void => {
  if (fs.existsSync(HISTORY_FILE)) {
    fs.unlinkSync(HISTORY_FILE)
  }
})

/**
 * SHELL: Open a URL in the default browser.
 */
ipcMain.handle('shell:openExternal', (_event, url: string): void => {
  shell.openExternal(url)
})

/**
 * THEME: Toggle native theme.
 */
ipcMain.handle('theme:get', (): 'dark' | 'light' => {
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
})

ipcMain.handle('theme:set', (_event, theme: 'dark' | 'light'): void => {
  nativeTheme.themeSource = theme
})

/**
 * APP: Get userData path (for display in settings).
 */
ipcMain.handle('app:getDataPath', (): string => USER_DATA)

/**
 * APP: Get current app version.
 */
ipcMain.handle('app:getVersion', (): string => app.getVersion())

/**
 * WINDOW CONTROLS: Minimize/close for custom frame.
 */
ipcMain.handle('window:minimize', (): void => {
  const win = getBrowserWindow()
  if (win) win.minimize()
})

ipcMain.handle('window:close', (): void => {
  const win = getBrowserWindow()
  if (win) win.close()
})

// ─── App Lifecycle ──────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async () => {
  if (activeClient) {
    try {
      await activeClient.disconnect()
    } catch {
      // ignore
    }
  }
})

// Prevent navigation to external URLs
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost') && !url.startsWith('file://')) {
      event.preventDefault()
    }
  })
})
