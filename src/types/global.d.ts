/**
 * src/types/global.d.ts
 * Augments the Window interface so React can use window.tgfetch with full TypeScript support.
 */

export type DownloadStatus = 'idle' | 'running' | 'completed' | 'error' | 'cancelled' | 'partial'

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

export interface ActivityLogItem {
  id: string
  type: 'info' | 'success' | 'error' | 'warning'
  message: string
  fileName?: string
  timestamp: number
}

interface TGfetchAPI {
  auth: {
    hasSession: () => Promise<boolean>
    restoreSession: () => Promise<{ success: boolean; error?: string }>
    connect: (credentials: { apiId: string; apiHash: string }) => Promise<{ success: boolean; error?: string }>
    logout: () => Promise<void>
    respondPhone: (phone: string) => void
    respondCode: (code: string) => void
    respondPassword: (pwd: string) => void
    onRequestPhone: (cb: () => void) => () => void
    onRequestCode: (cb: () => void) => () => void
    onRequestPassword: (cb: () => void) => () => void
    onError: (cb: (payload: { message: string }) => void) => () => void
  }
  download: {
    start: (params: { channelId: string; downloadPath: string }) => Promise<{ success: boolean; error?: string }>
    cancel: () => Promise<void>
    onStatus: (cb: (payload: { status?: DownloadStatus; message?: string }) => void) => () => void
    onTotal: (cb: (payload: { total: number }) => void) => () => void
    onFileStart: (cb: (payload: { fileName: string; fileIndex: number; total: number }) => void) => () => void
    onFileProgress: (cb: (payload: { fileName: string; percent: number; downloadedBytes: number; totalBytes: number }) => void) => () => void
    onFileComplete: (cb: (payload: { fileName: string; downloaded: number; total: number; percent: number }) => void) => () => void
    onFileError: (cb: (payload: { fileName: string; error: string }) => void) => () => void
    onComplete: (cb: (payload: { downloaded: number; total: number; errors: number; status: DownloadStatus; totalSize: number; durationMs: number; averageSpeed: number }) => void) => () => void
    onError: (cb: (payload: { error: string }) => void) => () => void
  }
  dialog: {
    openFolder: () => Promise<string | null>
  }
  history: {
    get: () => Promise<HistoryEntry[]>
    clear: () => Promise<void>
  }
  shell: {
    openExternal: (url: string) => Promise<void>
  }
  theme: {
    get: () => Promise<'dark' | 'light'>
    set: (theme: 'dark' | 'light') => Promise<void>
  }
  app: {
    getDataPath: () => Promise<string>
    getVersion: () => Promise<string>
  }
}

declare global {
  interface Window {
    tgfetch: TGfetchAPI
  }
}
