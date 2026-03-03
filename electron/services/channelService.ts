/**
 * electron/services/channelService.ts
 * 
 * Channel management service - fetch channels, media, etc.
 */

import type { TelegramClient } from 'telegram'
import type { Api } from 'telegram'

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
  date: Date
  duration?: number
  thumbnail?: string
  mimeType?: string
}

export interface MediaBatch {
  items: MediaItem[]
  hasMore: boolean
  offsetId: number
}

export class ChannelService {
  private client: TelegramClient
  
  constructor(client: TelegramClient) {
    this.client = client
  }
  
  /**
   * Fetch all joined channels
   */
  async getJoinedChannels(): Promise<ChannelInfo[]> {
    const dialogs = await this.client.getDialogs({ limit: 100 })
    const channels: ChannelInfo[] = []
    
    for (const dialog of dialogs) {
      const entity = dialog.entity
      
      // Filter only channels, megagroups, and supergroups
      if (!entity || !('broadcast' in entity || 'megagroup' in entity)) {
        continue
      }
      
      const channel = entity as Api.Channel
      
      // Skip if not a channel/supergroup/megagroup
      if (!channel.broadcast && !channel.megagroup) {
        continue
      }
      
      // Download profile photo and convert to base64
      let avatarBase64: string | undefined
      try {
        if (channel.photo && 'photoId' in channel.photo) {
          const photoBuffer = await this.client.downloadProfilePhoto(channel, {
            isBig: false
          }) as Buffer
          
          if (photoBuffer) {
            avatarBase64 = `data:image/jpeg;base64,${photoBuffer.toString('base64')}`
          }
        }
      } catch (error) {
        // Silently fail if photo download fails
        console.log(`Failed to download photo for channel ${channel.title}:`, error)
      }
      
      channels.push({
        id: Number(channel.id),
        title: channel.title,
        username: channel.username,
        photo: undefined,
        avatar: avatarBase64,
        isPrivate: !channel.username,
        participantsCount: channel.participantsCount,
      })
    }
    
    return channels
  }
  
  /**
   * Get channel entity by ID or username
   */
  async getChannel(identifier: string | number): Promise<Api.Channel> {
    const entity = await this.client.getEntity(this.normalizeChannel(identifier))
    
    if (!entity || !('broadcast' in entity || 'megagroup' in entity)) {
      throw new Error('Not a valid channel')
    }
    
    return entity as Api.Channel
  }
  
  /**
   * Fetch media from a channel with pagination
   */
  async getChannelMedia(
    channelId: string | number,
    options: {
      limit?: number
      offsetId?: number
      filter?: 'all' | 'video' | 'document' | 'photo' | 'audio'
    } = {}
  ): Promise<MediaBatch> {
    const { limit = 100, offsetId = 0, filter = 'all' } = options
    
    const channel = await this.getChannel(channelId)
    const messages: Api.Message[] = []
    
    // Fetch messages
    const iterator = this.client.iterMessages(channel, {
      limit,
      offsetId,
      reverse: false,
    })
    
    for await (const message of iterator) {
      const msg = message as Api.Message
      if (msg.media && this.isMediaMessage(msg, filter)) {
        messages.push(msg)
      }
    }
    
    // Convert to MediaItem
    const itemPromises = messages.map(msg => this.messageToMediaItem(msg))
    const items = (await Promise.all(itemPromises)).filter(Boolean) as MediaItem[]
    
    return {
      items,
      hasMore: messages.length >= limit,
      offsetId: messages.length > 0 ? messages[messages.length - 1].id : offsetId,
    }
  }
  
  /**
   * Check if message contains media of specified type
   */
  private isMediaMessage(msg: Api.Message, filter: string): boolean {
    if (!msg.media) return false
    
    const media = msg.media
    
    if (filter === 'all') {
      return (
        media.className === 'MessageMediaDocument' ||
        media.className === 'MessageMediaPhoto'
      )
    }
    
    if (filter === 'photo') {
      return media.className === 'MessageMediaPhoto'
    }
    
    if (media.className === 'MessageMediaDocument' && 'document' in media) {
      const doc = media.document as Api.Document
      const mimeType = doc.mimeType || ''
      
      if (filter === 'video') {
        return mimeType.startsWith('video/')
      }
      
      if (filter === 'audio') {
        return mimeType.startsWith('audio/')
      }
      
      if (filter === 'document') {
        return true
      }
    }
    
    return false
  }
  
  /**
   * Convert Telegram message to MediaItem
   */
  private async messageToMediaItem(msg: Api.Message): Promise<MediaItem | null> {
    if (!msg.media) return null
    
    const media = msg.media
    
    // Handle photos
    if (media.className === 'MessageMediaPhoto') {
      let thumbnail: string | undefined
      try {
        const photoBuffer = await this.client.downloadMedia(msg, {
          isBig: false
        }) as Buffer
        
        if (photoBuffer) {
          thumbnail = `data:image/jpeg;base64,${photoBuffer.toString('base64')}`
        }
      } catch (err) {
        // Silently skip if photo download fails
      }

      return {
        messageId: msg.id,
        fileName: `photo_${msg.id}.jpg`,
        size: 0, // Photos don't have size in metadata
        type: 'photo',
        date: new Date(msg.date * 1000),
        thumbnail,
      }
    }
    
    // Handle documents (videos, files, audio)
    if (media.className === 'MessageMediaDocument' && 'document' in media) {
      const doc = media.document as Api.Document
      
      // Get file name
      let fileName = `file_${msg.id}`
      const fileNameAttr = doc.attributes.find(
        a => a.className === 'DocumentAttributeFilename'
      ) as Api.DocumentAttributeFilename | undefined
      
      if (fileNameAttr?.fileName) {
        fileName = fileNameAttr.fileName
      } else {
        const mimeType = doc.mimeType || 'application/octet-stream'
        const ext = mimeType.split('/')[1] || 'bin'
        fileName = `media_${msg.id}.${ext}`
      }
      
      // Get video duration
      let duration: number | undefined
      const videoAttr = doc.attributes.find(
        a => a.className === 'DocumentAttributeVideo'
      ) as Api.DocumentAttributeVideo | undefined
      
      if (videoAttr) {
        duration = videoAttr.duration
      }
      
      // Determine type from MIME
      const mimeType = doc.mimeType || ''
      let type: MediaItem['type'] = 'document'
      
      if (mimeType.startsWith('video/')) {
        type = 'video'
      } else if (mimeType.startsWith('audio/')) {
        type = 'audio'
      }

      // Fetch smallest thumbnail for videos/documents
      let thumbnail: string | undefined
      try {
        if (doc.thumbs && doc.thumbs.length > 0) {
          const thumb = doc.thumbs[0] // smallest
          const thumbBuffer = await this.client.downloadMedia(msg, {
            thumb: thumb
          }) as Buffer
          
          if (thumbBuffer) {
            thumbnail = `data:image/jpeg;base64,${thumbBuffer.toString('base64')}`
          }
        }
      } catch (err) {
        // Silently skip if thumbnail download fails
      }
      
      return {
        messageId: msg.id,
        fileName,
        size: Number(doc.size),
        type,
        date: new Date(msg.date * 1000),
        duration,
        mimeType,
        thumbnail,
      }
    }
    
    return null
  }
  
  /**
   * Normalize channel identifier
   */
  private normalizeChannel(input: string | number): string | number {
    if (typeof input === 'number') {
      return input
    }
    
    const trimmed = input.trim()
    
    // If numeric ID like -1002628823561
    if (/^-?\d+$/.test(trimmed)) {
      return Number(trimmed)
    }
    
    // If full t.me link
    if (trimmed.includes('t.me/')) {
      const parts = trimmed.split('t.me/')[1]
      
      if (parts.startsWith('c/')) {
        const id = parts.replace('c/', '')
        return Number('-100' + id)
      }
      
      return '@' + parts.replace('/', '')
    }
    
    // If username without @
    if (!trimmed.startsWith('@')) {
      return '@' + trimmed
    }
    
    return trimmed
  }
  
  /**
   * Search media by filename
   */
  async searchMedia(
    channelId: string | number,
    query: string,
    limit: number = 50
  ): Promise<MediaItem[]> {
    const channel = await this.getChannel(channelId)
    const items: MediaItem[] = []
    
    const iterator = this.client.iterMessages(channel, {
      limit: 200, // Search more messages
      search: query,
    })
    
    for await (const message of iterator) {
      const msg = message as Api.Message
      if (msg.media) {
        const item = this.messageToMediaItem(msg)
        if (item) {
          items.push(item)
        }
      }
      
      if (items.length >= limit) break
    }
    
    return items
  }
}
