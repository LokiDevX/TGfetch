import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DownloadStatus, HistoryEntry, ActivityLogItem, AuthStatus, ChannelInfo, MediaItem } from '../types/global'

export interface Credentials {
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
  status: AuthStatus
  phoneNumber?: string
  error?: string
  qrCode?: string
}

export type AuthView =
  | 'initial'
  | 'qr'
  | 'phone'
  | 'code'
  | 'password'

export type AppPage = 'dashboard' | 'history' | 'settings' | 'channels' | 'media'
export type Theme = 'dark' | 'light'
export type MediaView = 'grid' | 'list'
export type MediaFilter = 'all' | 'video' | 'document' | 'photo' | 'audio'

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
  authView: AuthView
  setAuthView: (view: AuthView) => void
  authModalOpen: boolean
  setAuthModalOpen: (open: boolean) => void

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

  // Channel & Media Management
  channels: ChannelInfo[]
  setChannels: (channels: ChannelInfo[]) => void
  
  selectedChannel: ChannelInfo | null
  setSelectedChannel: (channel: ChannelInfo | null) => void
  
  mediaItems: MediaItem[]
  setMediaItems: (items: MediaItem[]) => void
  
  selectedMediaIds: Set<number>
  toggleMediaSelection: (messageId: number) => void
  selectAllMedia: () => void
  clearMediaSelection: () => void
  
  mediaView: MediaView
  setMediaView: (view: MediaView) => void
  
  mediaFilter: MediaFilter
  setMediaFilter: (filter: MediaFilter) => void
  
  mediaSearchQuery: string
  setMediaSearchQuery: (query: string) => void
}

const DEFAULT_CREDENTIALS: Credentials = {
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
  status: 'idle',
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
      authView: 'initial',
      setAuthView: (view) => set({ authView: view }),
      authModalOpen: false,
      setAuthModalOpen: (open) => set({ authModalOpen: open }),

      history: [],
      setHistory: (entries) => set({ history: entries }),

      activePage: 'dashboard',
      setActivePage: (page) => set({ activePage: page }),

      theme: 'light',
      setTheme: (theme) => set({ theme }),

      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      activityLogOpen: true,
      setActivityLogOpen: (open) => set({ activityLogOpen: open }),

      // Channel & Media Management
      channels: [],
      setChannels: (channels) => set({ channels }),
      
      selectedChannel: null,
      setSelectedChannel: (channel) => set({ 
        selectedChannel: channel,
        mediaItems: [], // Reset media when changing channels
        selectedMediaIds: new Set(),
      }),
      
      mediaItems: [],
      setMediaItems: (items) => set({ mediaItems: items }),
      
      selectedMediaIds: new Set(),
      toggleMediaSelection: (messageId) =>
        set((state) => {
          const newSelection = new Set(state.selectedMediaIds)
          if (newSelection.has(messageId)) {
            newSelection.delete(messageId)
          } else {
            newSelection.add(messageId)
          }
          return { selectedMediaIds: newSelection }
        }),
      selectAllMedia: () =>
        set((state) => ({
          selectedMediaIds: new Set(state.mediaItems.map(item => item.messageId))
        })),
      clearMediaSelection: () =>
        set({ selectedMediaIds: new Set() }),
      
      mediaView: 'grid',
      setMediaView: (view) => set({ mediaView: view }),
      
      mediaFilter: 'all',
      setMediaFilter: (filter) => set({ mediaFilter: filter }),
      
      mediaSearchQuery: '',
      setMediaSearchQuery: (query) => set({ mediaSearchQuery: query }),
    }),
    {
      name: 'tgfetch-store',
      partialize: (state) => ({
        credentials: {
          channelId: state.credentials.channelId,
          downloadPath: state.credentials.downloadPath,
        },
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        activityLogOpen: state.activityLogOpen,
        mediaView: state.mediaView,
      }),
    }
  )
)
