/**
 * electron/services/downloadManager.ts
 * 
 * Download management service - handles single and multi-file downloads with concurrency control
 */

import type { TelegramClient } from 'telegram'
import type { Api } from 'telegram'
import { errors } from 'telegram'
import fs from 'fs'
import path from 'path'

export interface DownloadOptions {
  channelId: string | number
  downloadPath: string
  messageIds: number[]
  concurrency?: number
}

export interface DownloadProgress {
  messageId: number
  fileName: string
  percent: number
  downloadedBytes: number
  totalBytes: number
  status: 'pending' | 'downloading' | 'completed' | 'error'
  error?: string
}

export interface DownloadStats {
  total: number
  completed: number
  failed: number
  totalBytes: number
  downloadedBytes: number
  startTime: number
  endTime?: number
}

export type DownloadEventCallback = (event: {
  type: 'start' | 'progress' | 'complete' | 'error' | 'fileStart' | 'fileProgress' | 'fileComplete' | 'fileError'
  data: any
}) => void

export class DownloadManager {
  private client: TelegramClient
  private isDownloading = false
  private shouldCancel = false
  private eventCallback?: DownloadEventCallback
  
  constructor(client: TelegramClient) {
    this.client = client
  }
  
  /**
   * Set event callback
   */
  onEvent(callback: DownloadEventCallback): void {
    this.eventCallback = callback
  }
  
  /**
   * Emit event
   */
  private emit(type: string, data: any): void {
    if (this.eventCallback) {
      this.eventCallback({ type: type as any, data })
    }
  }
  
  /**
   * Check if currently downloading
   */
  isActive(): boolean {
    return this.isDownloading
  }
  
  /**
   * Cancel active download
   */
  cancel(): void {
    this.shouldCancel = true
  }
  
  /**
   * Download single file
   */
  async downloadSingle(
    channelId: string | number,
    messageId: number,
    downloadPath: string
  ): Promise<{ success: boolean; error?: string; filePath?: string }> {
    try {
      const entity = await this.client.getEntity(this.normalizeChannel(channelId))
      
      // Get the message
      const messages = await this.client.getMessages(entity, { ids: [messageId] })
      const message = messages[0] as Api.Message
      
      if (!message || !message.media) {
        return { success: false, error: 'Message not found or has no media' }
      }
      
      const fileName = this.getFileName(message)
      const filePath = path.join(downloadPath, fileName)
      
      fs.mkdirSync(downloadPath, { recursive: true })
      
      this.emit('fileStart', { fileName, messageId })
      
      const buffer = await this.client.downloadMedia(message, {
        progressCallback: (downloaded: unknown, total: unknown) => {
          const dl = Number(downloaded)
          const tot = Number(total)
          const percent = tot > 0 ? Math.round((dl / tot) * 100) : 0
          
          this.emit('fileProgress', {
            fileName,
            messageId,
            percent,
            downloadedBytes: dl,
            totalBytes: tot,
          })
        },
      }) as Buffer | undefined
      
      if (!buffer) {
        return { success: false, error: 'Download failed' }
      }
      
      fs.writeFileSync(filePath, buffer)
      
      this.emit('fileComplete', {
        fileName,
        messageId,
        filePath,
        size: buffer.length,
      })
      
      return { success: true, filePath }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      this.emit('fileError', { messageId, error })
      return { success: false, error }
    }
  }
  
  /**
   * Download multiple files with concurrency control
   */
  async downloadMultiple(options: DownloadOptions): Promise<DownloadStats> {
    if (this.isDownloading) {
      throw new Error('Download already in progress')
    }
    
    this.isDownloading = true
    this.shouldCancel = false
    
    const { channelId, downloadPath, messageIds, concurrency = 5 } = options
    
    const stats: DownloadStats = {
      total: messageIds.length,
      completed: 0,
      failed: 0,
      totalBytes: 0,
      downloadedBytes: 0,
      startTime: Date.now(),
    }
    
    try {
      // Ensure directory exists
      fs.mkdirSync(downloadPath, { recursive: true })
      
      // Get channel entity
      const entity = await this.client.getEntity(this.normalizeChannel(channelId))
      
      // Fetch all messages first
      this.emit('start', { total: messageIds.length })
      
      const messages = await this.client.getMessages(entity, { ids: messageIds })
      const validMessages = messages.filter(m => m && (m as Api.Message).media) as Api.Message[]
      
      if (validMessages.length === 0) {
        throw new Error('No valid media messages found')
      }
      
      stats.total = validMessages.length
      
      // Create download queue
      const queue = [...validMessages]
      
      // Worker function
      const worker = async (): Promise<void> => {
        while (queue.length > 0 && !this.shouldCancel) {
          const message = queue.shift()!
          const fileName = this.getFileName(message)
          const filePath = path.join(downloadPath, fileName)
          
          this.emit('fileStart', {
            fileName,
            messageId: message.id,
            fileIndex: stats.completed + stats.failed + 1,
            total: stats.total,
          })
          
          let retryCount = 0
          let success = false
          
          while (!success && retryCount < 3 && !this.shouldCancel) {
            try {
              const buffer = await this.client.downloadMedia(message, {
                progressCallback: (downloaded: unknown, total: unknown) => {
                  const dl = Number(downloaded)
                  const tot = Number(total)
                  const percent = tot > 0 ? Math.round((dl / tot) * 100) : 0
                  
                  this.emit('fileProgress', {
                    fileName,
                    messageId: message.id,
                    percent,
                    downloadedBytes: dl,
                    totalBytes: tot,
                  })
                },
              }) as Buffer | undefined
              
              if (buffer) {
                fs.writeFileSync(filePath, buffer)
                stats.downloadedBytes += buffer.length
                stats.completed++
                success = true
                
                this.emit('fileComplete', {
                  fileName,
                  messageId: message.id,
                  downloaded: stats.completed,
                  total: stats.total,
                  percent: Math.round((stats.completed / stats.total) * 100),
                })
              }
            } catch (err) {
              if (err instanceof errors.FloodWaitError) {
                const waitSeconds = err.seconds
                console.warn(`Flood wait: ${waitSeconds}s`)
                
                this.emit('progress', {
                  status: 'waiting',
                  message: `Rate limited. Waiting ${waitSeconds}s...`,
                })
                
                await new Promise(resolve => setTimeout(resolve, (waitSeconds + 1) * 1000))
                retryCount++
              } else {
                console.error(`Download error for ${fileName}:`, err)
                break
              }
            }
          }
          
          if (!success) {
            stats.failed++
            const error = 'Download failed after retries'
            
            this.emit('fileError', {
              fileName,
              messageId: message.id,
              error,
            })
          }
        }
      }
      
      // Start workers
      const workers = Array.from(
        { length: Math.min(concurrency, stats.total) },
        () => worker()
      )
      
      await Promise.all(workers)
      
      stats.endTime = Date.now()
      
      this.emit('complete', {
        ...stats,
        status: this.shouldCancel ? 'cancelled' : stats.failed === 0 ? 'completed' : 'partial',
      })
      
      return stats
    } catch (err) {
      stats.endTime = Date.now()
      const error = err instanceof Error ? err.message : String(err)
      
      this.emit('error', { error })
      
      throw err
    } finally {
      this.isDownloading = false
      this.shouldCancel = false
    }
  }
  
  /**
   * Get filename from message
   */
  private getFileName(message: Api.Message): string {
    if (!message.media) {
      return `file_${message.id}`
    }
    
    const media = message.media
    
    // Handle photos
    if (media.className === 'MessageMediaPhoto') {
      return `photo_${message.id}.jpg`
    }
    
    // Handle documents
    if (media.className === 'MessageMediaDocument' && 'document' in media) {
      const doc = media.document as Api.Document
      
      // Try to get filename from attributes
      const fileNameAttr = doc.attributes.find(
        a => a.className === 'DocumentAttributeFilename'
      ) as Api.DocumentAttributeFilename | undefined
      
      if (fileNameAttr?.fileName) {
        return fileNameAttr.fileName
      }
      
      // Generate from MIME type
      const mimeType = doc.mimeType || 'application/octet-stream'
      const ext = mimeType.split('/')[1] || 'bin'
      return `media_${message.id}.${ext}`
    }
    
    return `file_${message.id}`
  }
  
  /**
   * Normalize channel identifier
   */
  private normalizeChannel(input: string | number): string | number {
    if (typeof input === 'number') {
      return input
    }
    
    const trimmed = input.trim()
    
    if (/^-?\d+$/.test(trimmed)) {
      return Number(trimmed)
    }
    
    if (trimmed.includes('t.me/')) {
      const parts = trimmed.split('t.me/')[1]
      
      if (parts.startsWith('c/')) {
        const id = parts.replace('c/', '')
        return Number('-100' + id)
      }
      
      return '@' + parts.replace('/', '')
    }
    
    if (!trimmed.startsWith('@')) {
      return '@' + trimmed
    }
    
    return trimmed
  }
}
