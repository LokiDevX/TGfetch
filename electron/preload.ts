/**
 * electron/preload.ts
 *
 * Preload script – executed in the renderer context before the page loads.
 * Uses contextBridge to safely expose a typed API surface to the React app.
 *
 * Security: contextIsolation is ON, nodeIntegration is OFF.
 * Nothing from Node.js leaks into the renderer — only explicitly whitelisted
 * channels and typed methods are exposed via `window.tgfetch`.
 */

import { contextBridge, ipcRenderer } from 'electron'

// ─── Typed API surface exposed to the renderer ───────────────────────────────

export type DownloadStatus = 'idle' | 'running' | 'completed' | 'error' | 'cancelled' | 'partial'

export type AuthStatus = 
  | 'idle'
  | 'restoring'
  | 'connecting'
  | 'qr_waiting'
  | 'qr_scanned'
  | 'waiting_for_phone'
  | 'waiting_for_code'
  | 'waiting_for_password'
  | 'authenticated'
  | 'expired'
  | 'error'

export interface AuthStatusPayload {
  status: AuthStatus
  error?: string
  phoneNumber?: string
  qrCode?: string
}

export interface ProgressPayload {
  status?: DownloadStatus
  message?: string
}

export interface FileCompletePayload {
  fileName: string
  downloaded: number
  total: number
  percent: number
}

export interface FileErrorPayload {
  fileName: string
  error: string
}

export interface DownloadCompletePayload {
  downloaded: number
  total: number
  errors: number
  status: DownloadStatus
}

export interface HistoryEntry {
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

// ─── IPC wrapper helpers ─────────────────────────────────────────────────────

// Generic typed invoke
function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  return ipcRenderer.invoke(channel, ...args) as Promise<T>
}

// Generic typed listener that returns a cleanup function
function on(channel: string, callback: (...args: unknown[]) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

// ─── Exposed API ─────────────────────────────────────────────────────────────

const tgfetchAPI = {
  // ── Auth ────────────────────────────────────────────────────────────────
  auth: {
    /**
     * Get current authentication status
     */
    getStatus: () => invoke<AuthStatusPayload>('auth:getStatus'),
    
    /**
     * Check if a saved session exists
     */
    hasSession: () => invoke<boolean>('auth:hasSession'),
    
    /**
     * Restore a previously saved session (auto-login)
     */
    restoreSession: () => invoke<{ success: boolean; error?: string }>('auth:restoreSession'),
    
    /**
     * Initiate new Telegram connection (starts interactive login flow)
     */
    connect: () => invoke<{ success: boolean; error?: string }>('auth:connect'),
    
    /**
     * Connect with QR code
     */
    connectWithQR: () => invoke<{ success: boolean; error?: string }>('auth:connectWithQR'),
    
    /**
     * Submit phone number during authentication
     */
    submitPhone: (phone: string) => invoke<void>('auth:submitPhone', phone),
    
    /**
     * Submit verification code during authentication
     */
    submitCode: (code: string) => invoke<void>('auth:submitCode', code),
    
    /**
     * Submit 2FA password during authentication
     */
    submitPassword: (password: string) => invoke<void>('auth:submitPassword', password),
    
    /**
     * Logout and clear session
     */
    logout: () => invoke<void>('auth:logout'),

    /**
     * Listen for auth status updates from main process
     */
    onStatusChange: (cb: (payload: AuthStatusPayload) => void) =>
      on('auth-status', cb as (...args: unknown[]) => void),
  },

  // ── Channels ─────────────────────────────────────────────────────────────
  channels: {
    /**
     * Get all joined channels
     */
    getJoined: () => invoke<any[]>('channels:getJoined'),
    
    /**
     * Get media from a channel
     */
    getMedia: (channelId: string | number, options?: any) =>
      invoke<any>('channels:getMedia', channelId, options),
    
    /**
     * Search media in a channel
     */
    searchMedia: (channelId: string | number, query: string, limit?: number) =>
      invoke<any[]>('channels:searchMedia', channelId, query, limit),
  },

  // ── Download ─────────────────────────────────────────────────────────────
  download: {
    start: (params: { channelId: string; downloadPath: string }) =>
      invoke<{ success: boolean; error?: string }>('download:start', params),
    
    /**
     * Download a single file
     */
    downloadSingle: (channelId: string | number, messageId: number, downloadPath: string) =>
      invoke<{ success: boolean; error?: string; filePath?: string }>('download:downloadSingle', channelId, messageId, downloadPath),
    
    /**
     * Download multiple files
     */
    downloadMultiple: (params: { channelId: string | number; messageIds: number[]; downloadPath: string }) =>
      invoke<{ success: boolean; error?: string }>('download:downloadMultiple', params),
    
    cancel: () => invoke<void>('download:cancel'),

    // Progress event listeners – each returns a cleanup/unsubscribe function
    onStatus: (cb: (payload: ProgressPayload) => void) =>
      on('download:status', cb as (...args: unknown[]) => void),
    onTotal: (cb: (payload: { total: number }) => void) =>
      on('download:total', cb as (...args: unknown[]) => void),
    onFileStart: (cb: (payload: { fileName: string; fileIndex: number; total: number }) => void) =>
      on('download:fileStart', cb as (...args: unknown[]) => void),
    onFileProgress: (cb: (payload: { fileName: string; percent: number }) => void) =>
      on('download:fileProgress', cb as (...args: unknown[]) => void),
    onFileComplete: (cb: (payload: FileCompletePayload) => void) =>
      on('download:fileComplete', cb as (...args: unknown[]) => void),
    onFileError: (cb: (payload: FileErrorPayload) => void) =>
      on('download:fileError', cb as (...args: unknown[]) => void),
    onComplete: (cb: (payload: DownloadCompletePayload) => void) =>
      on('download:complete', cb as (...args: unknown[]) => void),
    onError: (cb: (payload: { error: string }) => void) =>
      on('download:error', cb as (...args: unknown[]) => void),
  },

  // ── Dialog ────────────────────────────────────────────────────────────────
  dialog: {
    openFolder: () => invoke<string | null>('dialog:openFolder'),
  },

  // ── History ───────────────────────────────────────────────────────────────
  history: {
    get: () => invoke<HistoryEntry[]>('history:get'),
    clear: () => invoke<void>('history:clear'),
  },

  // ── Shell ────────────────────────────────────────────────────────────────
  shell: {
    openExternal: (url: string) => invoke<void>('shell:openExternal', url),
  },

  // ── Theme ────────────────────────────────────────────────────────────────
  theme: {
    get: () => invoke<'dark' | 'light'>('theme:get'),
    set: (theme: 'dark' | 'light') => invoke<void>('theme:set', theme),
  },

  // ── App ──────────────────────────────────────────────────────────────────
  app: {
    getDataPath: () => invoke<string>('app:getDataPath'),
    getVersion: () => invoke<string>('app:getVersion'),
  },

  // ── Window Controls ──────────────────────────────────────────────────────
  window: {
    minimize: () => invoke<void>('window:minimize'),
    maximize: () => invoke<void>('window:maximize'),
    close: () => invoke<void>('window:close'),
  }
}

contextBridge.exposeInMainWorld('tgfetch', tgfetchAPI)

// ─── Global type augmentation for TypeScript ────────────────────────────────
// (This block is only consumed by the renderer's tsconfig, not compiled here.)
export type TGfetchAPI = typeof tgfetchAPI
