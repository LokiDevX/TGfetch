import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DownloadStatus, HistoryEntry, ActivityLogItem } from '../types/global'

export interface Credentials {
  apiId: string
  apiHash: string
  channelId: string
  downloadPath: string
}

export interface DownloadProgress {
  total: number
  downloaded: number
  currentFile: string
  currentFilePercent: number
  currentFileSize: number
  currentFileDownloaded: number
  speed: number
  eta: number
  percent: number
  status: DownloadStatus
  statusMessage: string
  totalSize?: number
  durationMs?: number
  averageSpeed?: number
}

export interface AuthState {
  isAuthenticated: boolean
  isConnecting: boolean
  pendingAction: 'phone' | 'code' | 'password' | null
}

export type AppPage = 'dashboard' | 'history' | 'settings'
export type Theme = 'dark' | 'light'

interface DownloadStore {
  credentials: Credentials
  setCredentials: (partial: Partial<Credentials>) => void

  progress: DownloadProgress
  setProgress: (partial: Partial<DownloadProgress>) => void
  resetProgress: () => void

  activityLog: ActivityLogItem[]
  addLog: (item: Omit<ActivityLogItem, 'id' | 'timestamp'>) => void
  clearLog: () => void

  auth: AuthState
  setAuth: (partial: Partial<AuthState>) => void

  history: HistoryEntry[]
  setHistory: (entries: HistoryEntry[]) => void

  activePage: AppPage
  setActivePage: (page: AppPage) => void

  theme: Theme
  setTheme: (theme: Theme) => void

  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void

  activityLogOpen: boolean
  setActivityLogOpen: (open: boolean) => void

  showAuthDialog: boolean
  setShowAuthDialog: (show: boolean) => void

  authDialogInput: string
  setAuthDialogInput: (val: string) => void
}

const DEFAULT_CREDENTIALS: Credentials = {
  apiId: '',
  apiHash: '',
  channelId: '',
  downloadPath: '',
}

const DEFAULT_PROGRESS: DownloadProgress = {
  total: 0,
  downloaded: 0,
  currentFile: '',
  currentFilePercent: 0,
  currentFileSize: 0,
  currentFileDownloaded: 0,
  speed: 0,
  eta: 0,
  percent: 0,
  status: 'idle',
  statusMessage: '',
}

const DEFAULT_AUTH: AuthState = {
  isAuthenticated: false,
  isConnecting: false,
  pendingAction: null,
}

export const useDownloadStore = create<DownloadStore>()(
  persist(
    (set, _get) => ({
      credentials: DEFAULT_CREDENTIALS,
      setCredentials: (partial) =>
        set((state) => ({ credentials: { ...state.credentials, ...partial } })),

      progress: DEFAULT_PROGRESS,
      setProgress: (partial) =>
        set((state) => ({ progress: { ...state.progress, ...partial } })),
      resetProgress: () => set({ progress: DEFAULT_PROGRESS }),

      activityLog: [],
      addLog: (item) =>
        set((state) => {
          const newEntry: ActivityLogItem = {
            ...item,
            id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            timestamp: Date.now(),
          }
          const trimmed = [...state.activityLog, newEntry].slice(-500)
          return { activityLog: trimmed }
        }),
      clearLog: () => set({ activityLog: [] }),

      auth: DEFAULT_AUTH,
      setAuth: (partial) =>
        set((state) => ({ auth: { ...state.auth, ...partial } })),

      history: [],
      setHistory: (entries) => set({ history: entries }),

      activePage: 'dashboard',
      setActivePage: (page) => set({ activePage: page }),

      theme: 'dark',
      setTheme: (theme) => set({ theme }),

      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      activityLogOpen: true,
      setActivityLogOpen: (open) => set({ activityLogOpen: open }),

      showAuthDialog: false,
      setShowAuthDialog: (show) => set({ showAuthDialog: show }),

      authDialogInput: '',
      setAuthDialogInput: (val) => set({ authDialogInput: val }),
    }),
    {
      name: 'tgfetch-store',
      partialize: (state) => ({
        credentials: {
          apiId: state.credentials.apiId,
          apiHash: state.credentials.apiHash,
          channelId: state.credentials.channelId,
          downloadPath: state.credentials.downloadPath,
        },
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        activityLogOpen: state.activityLogOpen,
      }),
    }
  )
)
