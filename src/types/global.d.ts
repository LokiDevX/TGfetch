/**
 * src/types/global.d.ts
 * Augments the Window interface so React can use window.tgfetch with full TypeScript support.
 */

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
  qrCode?: string // base64 QR code image
}

export interface ChannelInfo {
  id: number
  title: string
  username?: string
  photo?: string
  avatar?: string // base64 encoded profile photo
  isPrivate: boolean
  memberCount?: number
  participantsCount?: number
}

export interface MediaItem {
  messageId: number
  fileName: string
  size: number
  type: 'video' | 'document' | 'audio' | 'photo'
  date: string // ISO date string
  duration?: number
  thumbnail?: string
  mimeType?: string
}

export interface MediaBatch {
  items: MediaItem[]
  hasMore: boolean
  offsetId: number
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

export interface ActivityLogItem {
  id: string
  type: 'info' | 'success' | 'error' | 'warning'
  message: string
  fileName?: string
  timestamp: number
}

interface TGfetchAPI {
  auth: {
    getStatus: () => Promise<AuthStatusPayload>
    hasSession: () => Promise<boolean>
    restoreSession: () => Promise<{ success: boolean; error?: string }>
    connect: () => Promise<{ success: boolean; error?: string }>
    connectWithQR: () => Promise<{ success: boolean; error?: string }>
    submitPhone: (phone: string) => Promise<void>
    submitCode: (code: string) => Promise<void>
    submitPassword: (password: string) => Promise<void>
    logout: () => Promise<void>
    onStatusChange: (cb: (payload: AuthStatusPayload) => void) => () => void
  }
  channels: {
    getJoined: () => Promise<ChannelInfo[]>
    getMedia: (channelId: string | number, options?: {
      limit?: number
      offsetId?: number
      filter?: 'all' | 'video' | 'document' | 'photo' | 'audio'
    }) => Promise<MediaBatch>
    searchMedia: (channelId: string | number, query: string, limit?: number) => Promise<MediaItem[]>
  }
  download: {
    start: (params: { channelId: string; downloadPath: string }) => Promise<{ success: boolean; error?: string }>
    downloadSingle: (channelId: string | number, messageId: number, downloadPath: string) => Promise<{ success: boolean; error?: string; filePath?: string }>
    downloadMultiple: (params: {
      channelId: string | number
      messageIds: number[]
      downloadPath: string
    }) => Promise<{ success: boolean; error?: string }>
    cancel: () => Promise<void>
    onStatus: (cb: (payload: { status?: DownloadStatus; message?: string }) => void) => () => void
    onTotal: (cb: (payload: { total: number }) => void) => () => void
    onFileStart: (cb: (payload: { fileName: string; fileIndex: number; total: number; messageId?: number }) => void) => () => void
    onFileProgress: (cb: (payload: { fileName: string; percent: number; downloadedBytes: number; totalBytes: number; messageId?: number }) => void) => () => void
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
  window: {
    minimize: () => Promise<void>
    maximize: () => Promise<void>
    close: () => Promise<void>
  }
}

declare global {
  interface Window {
    tgfetch: TGfetchAPI
  }
}

// Image module declarations for Vite
declare module '*.png' {
  const value: string
  export default value
}

declare module '*.jpg' {
  const value: string
  export default value
}

declare module '*.jpeg' {
  const value: string
  export default value
}

declare module '*.svg' {
  const value: string
  export default value
}

declare module '*.gif' {
  const value: string
  export default value
}

declare module '*.webp' {
  const value: string
  export default value
}
