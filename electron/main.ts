/**
 * electron/main-new.ts
 *
 * Refactored Electron main process using service layer architecture
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

import { TelegramService, type SessionData } from './services/telegramService'
import { ChannelService } from './services/channelService'
import { DownloadManager } from './services/downloadManager'

import * as dotenv from 'dotenv'

// Load environment variables
const envPath = path.join(process.cwd(), '.env')
console.log('Loading .env from:', envPath)
dotenv.config({ path: envPath })

// ─── Constants ─────────────────────────────────────────────────────────────

const IS_DEV = process.env.NODE_ENV === 'development'
const USER_DATA = app.getPath('userData')
const SESSION_FILE = path.join(USER_DATA, 'session.json')
const HISTORY_FILE = path.join(USER_DATA, 'history.json')

// Ensure only a single instance of the app runs. If a second instance
// is started (e.g. running `npm run dev` a second time), quit the
// second instance and focus the existing window instead.
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = getBrowserWindow()
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })
}

/**
 * 🔐 SECURITY: API credentials from environment variables
 */
const API_ID = Number(process.env.TG_API_ID ?? 0)
const API_HASH = process.env.TG_API_HASH ?? ''

// Validate credentials early
if (!API_ID || !API_HASH) {
  const errorMsg = 'Missing Telegram API credentials. Please set TG_API_ID and TG_API_HASH in environment variables.'
  console.error(errorMsg)
  // On production, we might want to show a dialog before quitting
  app.whenReady().then(() => {
    dialog.showErrorBox('Configuration Error', errorMsg)
    app.quit()
  })
}

// ─── Services ──────────────────────────────────────────────────────────────

let telegramService: TelegramService
let channelService: ChannelService | null = null
let downloadManager: DownloadManager | null = null

// ─── Types ──────────────────────────────────────────────────────────────────

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
    title: 'TGfetch – Telegram Media Manager by Loki',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
    icon: path.join(app.getAppPath(), IS_DEV ? 'public' : 'dist', 'icon.png'),
  })

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

function getBrowserWindow(): BrowserWindow | undefined {
  return BrowserWindow.getAllWindows()[0]
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function readSessionFile(): SessionData | null {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      const raw = fs.readFileSync(SESSION_FILE, 'utf-8')
      return JSON.parse(raw) as SessionData
    }
  } catch {
    // Corrupt session file
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
  history.unshift(entry)
  const trimmed = history.slice(0, 200)
  fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true })
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2), 'utf-8')
}

function sendToRenderer(event: string, payload: unknown): void {
  const win = getBrowserWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send(event, payload)
  }
}

// ─── Initialize Services ────────────────────────────────────────────────────

function initializeServices(): void {
  // Read any saved session BEFORE constructing the service so the TelegramClient
  // is created with the right StringSession — ensuring connect() is called only once.
  const savedForInit = readSessionFile()

  // Ensure API_ID and API_HASH are valid before instantiating TelegramService
  if (API_ID && API_HASH) {
    telegramService = new TelegramService(API_ID, API_HASH, savedForInit?.session ?? '')
  } else {
    // This should never happen due to the check at startup, but TS doesn't know that
    telegramService = new TelegramService(0, '', '')
  }
  
  // Listen to auth status changes and forward to renderer
  telegramService?.onStatusChange((state) => {
    sendToRenderer('auth-status', state)
    
    // Initialize channel and download services when authenticated
    if (state.status === 'authenticated') {
      const client = telegramService.getClient()
      channelService = new ChannelService(client)
      downloadManager = new DownloadManager(client)
      
      // Setup download event listeners
      downloadManager.onEvent((event) => {
        switch (event.type) {
          case 'start':
            sendToRenderer('download:total', { total: event.data.total })
            break
          case 'fileStart':
            sendToRenderer('download:fileStart', event.data)
            break
          case 'fileProgress':
            sendToRenderer('download:fileProgress', event.data)
            break
          case 'fileComplete':
            sendToRenderer('download:fileComplete', event.data)
            break
          case 'fileError':
            sendToRenderer('download:fileError', event.data)
            break
          case 'complete':
            sendToRenderer('download:complete', event.data)
            break
          case 'error':
            sendToRenderer('download:error', event.data)
            break
          case 'progress':
            sendToRenderer('download:status', event.data)
            break
        }
      })
    } else if (state.status === 'idle') {
      // Clear services on logout
      channelService = null
      downloadManager = null
    }
  })
}

// ─── IPC Handlers: Auth ─────────────────────────────────────────────────────

ipcMain.handle('auth:getStatus', () => {
  return telegramService.getAuthState()
})

ipcMain.handle('auth:hasSession', (): boolean => {
  return readSessionFile() !== null
})

ipcMain.handle('auth:restoreSession', async () => {
  const saved = readSessionFile()
  if (!saved) {
    return { success: false, error: 'No saved session.' }
  }

  try {
    const success = await telegramService.restoreSession(saved)
    return { success }
  } catch (err) {
    deleteSessionFile()
    const error = err instanceof Error ? err.message : String(err)
    return { success: false, error }
  }
})

ipcMain.handle('auth:connect', async () => {
  try {
    await telegramService.startPhoneLogin()
    
    // Wait for authentication
    return new Promise((resolve) => {
      const checkAuth = () => {
        const state = telegramService.getAuthState()
        if (state.status === 'authenticated') {
          // Save session
          const sessionString = telegramService.getSessionString()
          writeSessionFile({
            session: sessionString,
            phoneNumber: state.phoneNumber,
          })
          resolve({ success: true })
        } else if (state.status === 'error') {
          resolve({ success: false, error: state.error })
        } else {
          setTimeout(checkAuth, 1000)
        }
      }
      checkAuth()
    })
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    return { success: false, error }
  }
})

ipcMain.handle('auth:connectWithQR', async () => {
  try {
    await telegramService.startQRLogin()
    
    // Wait for authentication or error
    return new Promise((resolve) => {
      const checkAuth = () => {
        const state = telegramService.getAuthState()
        if (state.status === 'authenticated') {
          // Save session
          const sessionString = telegramService.getSessionString()
          writeSessionFile({
            session: sessionString,
            phoneNumber: state.phoneNumber,
          })
          resolve({ success: true })
        } else if (state.status === 'error' || state.status === 'expired') {
          resolve({ success: false, error: state.error })
        } else {
          setTimeout(checkAuth, 1000)
        }
      }
      checkAuth()
    })
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    return { success: false, error }
  }
})

ipcMain.handle('auth:submitPhone', (_event, phone: string) => {
  telegramService.submitPhone(phone)
})

ipcMain.handle('auth:submitCode', (_event, code: string) => {
  telegramService.submitCode(code)
})

ipcMain.handle('auth:submitPassword', (_event, password: string) => {
  telegramService.submitPassword(password)
})

ipcMain.handle('auth:logout', async () => {
  await telegramService.logout()
  deleteSessionFile()
})

// ─── IPC Handlers: Channels ─────────────────────────────────────────────────

ipcMain.handle('channels:getJoined', async () => {
  if (!channelService) {
    throw new Error('Not authenticated')
  }
  return await channelService.getJoinedChannels()
})

ipcMain.handle('channels:getMedia', async (_event, channelId: string | number, options?: any) => {
  if (!channelService) {
    throw new Error('Not authenticated')
  }
  const batch = await channelService.getChannelMedia(channelId, options)
  
  // Convert dates to ISO strings for serialization
  return {
    ...batch,
    items: batch.items.map(item => ({
      ...item,
      date: item.date.toISOString(),
    })),
  }
})

ipcMain.handle('channels:searchMedia', async (_event, channelId: string | number, query: string, limit?: number) => {
  if (!channelService) {
    throw new Error('Not authenticated')
  }
  const items = await channelService.searchMedia(channelId, query, limit)
  
  // Convert dates to ISO strings
  return items.map(item => ({
    ...item,
    date: item.date.toISOString(),
  }))
})

// ─── IPC Handlers: Download ─────────────────────────────────────────────────

ipcMain.handle('download:downloadSingle', async (_event, channelId: string | number, messageId: number, downloadPath: string) => {
  if (!downloadManager) {
    return { success: false, error: 'Not authenticated' }
  }

  if (!downloadPath) {
    return { success: false, error: 'Download path not set' }
  }
  
  try {
    return await downloadManager.downloadSingle(channelId, messageId, downloadPath)
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    return { success: false, error }
  }
})

ipcMain.handle('download:downloadMultiple', async (_event, params: {
  channelId: string | number
  messageIds: number[]
  downloadPath: string
}) => {
  if (!downloadManager) {
    return { success: false, error: 'Not authenticated' }
  }

  if (!params.downloadPath) {
    return { success: false, error: 'Download path not set' }
  }
  
  try {
    const stats = await downloadManager.downloadMultiple(params)
    return { success: true, stats }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    return { success: false, error }
  }
})

ipcMain.handle('download:cancel', async () => {
  if (downloadManager) {
    downloadManager.cancel()
  }
})

// Keep legacy download:start for backward compatibility
ipcMain.handle('download:start', async (_event, { channelId, downloadPath }: { channelId: string; downloadPath: string }) => {
  if (!downloadManager || !channelService) {
    return { success: false, error: 'Not authenticated' }
  }
  
  try {
    sendToRenderer('download:status', { status: 'running', message: 'Fetching channel media...' })
    
    // Fetch all media from channel
    const batch = await channelService.getChannelMedia(channelId, { limit: 1000 })
    const messageIds = batch.items.map(item => item.messageId)
    
    if (messageIds.length === 0) {
      return { success: false, error: 'No media found in channel' }
    }
    
    // Download all
    const stats = await downloadManager.downloadMultiple({
      channelId,
      messageIds,
      downloadPath,
      concurrency: 5,
    })
    
    // Add to history
    appendHistory({
      id: `dl-${Date.now()}`,
      channelId: String(channelId),
      downloadPath,
      totalFiles: stats.total,
      downloadedFiles: stats.completed,
      status: stats.failed === 0 ? 'completed' : stats.completed > 0 ? 'partial' : 'error',
      startedAt: new Date(stats.startTime).toISOString(),
      completedAt: new Date(stats.endTime || Date.now()).toISOString(),
    })
    
    return { success: true }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    return { success: false, error }
  }
})

// ─── IPC Handlers: Other ────────────────────────────────────────────────────

ipcMain.handle('dialog:openFolder', async () => {
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

ipcMain.handle('history:get', (): HistoryEntry[] => {
  return readHistory()
})

ipcMain.handle('history:clear', (): void => {
  if (fs.existsSync(HISTORY_FILE)) {
    fs.unlinkSync(HISTORY_FILE)
  }
})

ipcMain.handle('shell:openExternal', (_event, url: string): void => {
  shell.openExternal(url)
})

ipcMain.handle('theme:get', (): 'dark' | 'light' => {
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
})

ipcMain.handle('theme:set', (_event, theme: 'dark' | 'light'): void => {
  nativeTheme.themeSource = theme
})

ipcMain.handle('app:getDataPath', (): string => USER_DATA)

ipcMain.handle('app:getVersion', (): string => app.getVersion())

ipcMain.handle('window:minimize', (): void => {
  const win = getBrowserWindow()
  if (win) win.minimize()
})

ipcMain.handle('window:maximize', (): void => {
  const win = getBrowserWindow()
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  }
})

ipcMain.handle('window:close', (): void => {
  const win = getBrowserWindow()
  if (win) win.close()
})

// ─── App Lifecycle ──────────────────────────────────────────────────────────

app.whenReady().then(() => {
  initializeServices()
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
  if (telegramService) {
    await telegramService.disconnect()
  }
})

app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost') && !url.startsWith('file://')) {
      event.preventDefault()
    }
  })
})
