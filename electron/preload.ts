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
    hasSession: () => invoke<boolean>('auth:hasSession'),
    restoreSession: () => invoke<{ success: boolean; error?: string }>('auth:restoreSession'),
    connect: (credentials: { apiId: string; apiHash: string }) =>
      invoke<{ success: boolean; error?: string }>('auth:connect', credentials),
    logout: () => invoke<void>('auth:logout'),

    // Phone/code/password responses sent back to main for interactive login
    respondPhone: (phone: string) => ipcRenderer.send('auth:phoneResponse', phone),
    respondCode: (code: string) => ipcRenderer.send('auth:codeResponse', code),
    respondPassword: (pwd: string) => ipcRenderer.send('auth:passwordResponse', pwd),

    // Listeners for main requesting input
    onRequestPhone: (cb: () => void) => on('auth:requestPhone', cb),
    onRequestCode: (cb: () => void) => on('auth:requestCode', cb),
    onRequestPassword: (cb: () => void) => on('auth:requestPassword', cb),
    onError: (cb: (payload: { message: string }) => void) =>
      on('auth:error', cb as (...args: unknown[]) => void),
  },

  // ── Download ─────────────────────────────────────────────────────────────
  download: {
    start: (params: { channelId: string; downloadPath: string }) =>
      invoke<{ success: boolean; error?: string }>('download:start', params),
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
}

contextBridge.exposeInMainWorld('tgfetch', tgfetchAPI)

// ─── Global type augmentation for TypeScript ────────────────────────────────
// (This block is only consumed by the renderer's tsconfig, not compiled here.)
export type TGfetchAPI = typeof tgfetchAPI
