/**
 * src/pages/Media.tsx
 * 
 * Media Browser - View and download media from selected channel
 */

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Download,
  Loader2,
  Grid3x3,
  List,
  Search,
  CheckSquare,
  Square,
  Video,
  FileText,
  Image as ImageIcon,
  Music,
  Filter,
  AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useDownloadStore } from '../store/downloadStore'
import type { MediaFilter } from '../store/downloadStore'
import type { MediaItem } from '../types/global'

export function Media(): JSX.Element {
  const {
    selectedChannel,
    setActivePage,
    mediaItems,
    setMediaItems,
    selectedMediaIds,
    toggleMediaSelection,
    selectAllMedia,
    clearMediaSelection,
    mediaView,
    setMediaView,
    mediaFilter,
    setMediaFilter,
    mediaSearchQuery,
    setMediaSearchQuery,
    credentials,
    addLog,
  } = useDownloadStore()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<Map<number, number>>(new Map())

  // Fetch media on mount
  useEffect(() => {
    if (selectedChannel) {
      fetchMedia()
    }
  }, [selectedChannel, mediaFilter])

  const fetchMedia = useCallback(async () => {
    if (!selectedChannel) return

    setIsLoading(true)
    setError(null)

    try {
      const batch = await window.tgfetch.channels.getMedia(selectedChannel.id, {
        limit: 200,
        filter: mediaFilter,
      })
      setMediaItems(batch.items)
      toast.success(`Found ${batch.items.length} media files`)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch media'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }, [selectedChannel, mediaFilter, setMediaItems])

  const handleDownloadSelected = useCallback(async () => {
    if (selectedMediaIds.size === 0) {
      toast.error('No files selected')
      return
    }

    if (!credentials.downloadPath) {
      toast.error('Please select a download folder first')
      return
    }

    if (!selectedChannel) return

    setIsDownloading(true)
    const messageIds = Array.from(selectedMediaIds)

    try {
      addLog({ type: 'info', message: `Downloading ${messageIds.length} files...` })

      const result = await window.tgfetch.download.downloadMultiple({
        channelId: selectedChannel.id,
        messageIds,
        downloadPath: credentials.downloadPath,
      })

      if (result.success) {
        toast.success('Download completed!')
        clearMediaSelection()
      } else {
        toast.error(result.error || 'Download failed')
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Download failed'
      toast.error(errorMsg)
      addLog({ type: 'error', message: errorMsg })
    } finally {
      setIsDownloading(false)
    }
  }, [selectedMediaIds, credentials.downloadPath, selectedChannel, clearMediaSelection, addLog])

  const handleDownloadSingle = useCallback(
    async (item: MediaItem) => {
      if (!credentials.downloadPath) {
        toast.error('Please select a download folder first')
        return
      }

      if (!selectedChannel) return

      setDownloadProgress(prev => new Map(prev).set(item.messageId, 0))

      try {
        const result = await window.tgfetch.download.downloadSingle(
          selectedChannel.id,
          item.messageId,
          credentials.downloadPath
        )

        if (result.success) {
          toast.success(`Downloaded ${item.fileName}`)
          setDownloadProgress(prev => {
            const next = new Map(prev)
            next.delete(item.messageId)
            return next
          })
        } else {
          toast.error(result.error || 'Download failed')
          setDownloadProgress(prev => {
            const next = new Map(prev)
            next.delete(item.messageId)
            return next
          })
        }
      } catch (err) {
        toast.error('Download failed')
        setDownloadProgress(prev => {
          const next = new Map(prev)
          next.delete(item.messageId)
          return next
        })
      }
    },
    [credentials.downloadPath, selectedChannel]
  )

  if (!selectedChannel) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="flex-1 flex items-center justify-center"
      >
        <div className="text-center">
          <p className="text-white/50">No channel selected</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex-1 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="px-8 py-6 border-b border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActivePage('channels')}
              className="p-2 rounded-xl hover:bg-white/10 text-white/70 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-white">{selectedChannel.title}</h2>
              <p className="text-sm text-white/50 mt-0.5">
                {mediaItems.length} media file{mediaItems.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
              <button
                onClick={() => setMediaView('grid')}
                className={`p-2 rounded transition-colors ${
                  mediaView === 'grid' ? 'bg-accent-blue text-white' : 'text-white/50 hover:text-white/70'
                }`}
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setMediaView('list')}
                className={`p-2 rounded transition-colors ${
                  mediaView === 'list' ? 'bg-accent-blue text-white' : 'text-white/50 hover:text-white/70'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Download selected */}
            {selectedMediaIds.size > 0 && (
              <button
                onClick={handleDownloadSelected}
                disabled={isDownloading}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-accent-blue to-accent-cyan text-white text-sm font-semibold hover:shadow-glow-blue transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download ({selectedMediaIds.size})
              </button>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          {/* Filter dropdown */}
          <div className="relative">
            <select
              value={mediaFilter}
              onChange={(e) => setMediaFilter(e.target.value as MediaFilter)}
              className="px-4 py-2 pr-8 rounded-xl bg-white/5 border border-white/10 text-white text-sm appearance-none cursor-pointer hover:bg-white/10 transition-colors"
            >
              <option value="all">All Media</option>
              <option value="video">Videos</option>
              <option value="photo">Photos</option>
              <option value="document">Documents</option>
              <option value="audio">Audio</option>
            </select>
            <Filter className="w-4 h-4 text-white/30 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Selection controls */}
          {mediaItems.length > 0 && (
            <>
              <button
                onClick={selectAllMedia}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-sm transition-colors flex items-center gap-2"
              >
                <CheckSquare className="w-4 h-4" />
                Select All
              </button>
              {selectedMediaIds.size > 0 && (
                <button
                  onClick={clearMediaSelection}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-sm transition-colors"
                >
                  Clear Selection
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-accent-blue animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <p className="text-white/50">{error}</p>
            </div>
          </div>
        ) : mediaItems.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-white/50">No media found</p>
            </div>
          </div>
        ) : mediaView === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {mediaItems.map((item) => (
              <MediaCard
                key={item.messageId}
                item={item}
                isSelected={selectedMediaIds.has(item.messageId)}
                onToggleSelect={() => toggleMediaSelection(item.messageId)}
                onDownload={() => handleDownloadSingle(item)}
                isDownloading={downloadProgress.has(item.messageId)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {mediaItems.map((item) => (
              <MediaListItem
                key={item.messageId}
                item={item}
                isSelected={selectedMediaIds.has(item.messageId)}
                onToggleSelect={() => toggleMediaSelection(item.messageId)}
                onDownload={() => handleDownloadSingle(item)}
                isDownloading={downloadProgress.has(item.messageId)}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// Media Card Component (Grid View)
interface MediaCardProps {
  item: MediaItem
  isSelected: boolean
  onToggleSelect: () => void
  onDownload: () => void
  isDownloading: boolean
}

function MediaCard({ item, isSelected, onToggleSelect, onDownload, isDownloading }: MediaCardProps): JSX.Element {
  const icon = getMediaIcon(item.type)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group relative bg-background-card border border-white/10 rounded-xl overflow-hidden hover:border-accent-blue/50 transition-all"
    >
      {/* Thumbnail/Icon */}
      <div className="aspect-square bg-gradient-to-br from-accent-blue/10 to-accent-cyan/10 flex items-center justify-center">
        {icon}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-xs text-white font-medium truncate mb-1">{item.fileName}</p>
        <p className="text-xs text-white/40">{formatFileSize(item.size)}</p>
        {item.duration && (
          <p className="text-xs text-white/40">{formatDuration(item.duration)}</p>
        )}
      </div>

      {/* Overlay actions */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        <button
          onClick={onToggleSelect}
          className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur transition-colors"
        >
          {isSelected ? (
            <CheckSquare className="w-5 h-5 text-accent-blue" />
          ) : (
            <Square className="w-5 h-5 text-white" />
          )}
        </button>
        <button
          onClick={onDownload}
          disabled={isDownloading}
          className="p-2.5 rounded-lg bg-accent-blue hover:bg-accent-cyan backdrop-blur transition-colors disabled:opacity-50"
        >
          {isDownloading ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
            <Download className="w-5 h-5 text-white" />
          )}
        </button>
      </div>
    </motion.div>
  )
}

// Media List Item Component (List View)
function MediaListItem({ item, isSelected, onToggleSelect, onDownload, isDownloading }: MediaCardProps): JSX.Element {
  const icon = getMediaIcon(item.type, 'w-5 h-5')

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-4 p-4 rounded-xl bg-background-card border border-white/10 hover:border-accent-blue/50 transition-all"
    >
      {/* Select checkbox */}
      <button onClick={onToggleSelect} className="flex-shrink-0">
        {isSelected ? (
          <CheckSquare className="w-5 h-5 text-accent-blue" />
        ) : (
          <Square className="w-5 h-5 text-white/30" />
        )}
      </button>

      {/* Icon */}
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-accent-blue/10 to-accent-cyan/10 flex items-center justify-center">
        {icon}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium truncate">{item.fileName}</p>
        <div className="flex items-center gap-3 text-xs text-white/40 mt-0.5">
          <span>{formatFileSize(item.size)}</span>
          {item.duration && <span>{formatDuration(item.duration)}</span>}
          <span>{new Date(item.date).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Download button */}
      <button
        onClick={onDownload}
        disabled={isDownloading}
        className="flex-shrink-0 p-2 rounded-lg bg-accent-blue/20 hover:bg-accent-blue/30 text-accent-blue transition-colors disabled:opacity-50"
      >
        {isDownloading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Download className="w-5 h-5" />
        )}
      </button>
    </motion.div>
  )
}

// Helper functions
function getMediaIcon(type: string, className = 'w-8 h-8 text-accent-blue'): JSX.Element {
  switch (type) {
    case 'video':
      return <Video className={className} />
    case 'photo':
      return <ImageIcon className={className} />
    case 'audio':
      return <Music className={className} />
    default:
      return <FileText className={className} />
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}
