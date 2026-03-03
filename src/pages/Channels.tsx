/**
 * src/pages/Channels.tsx
 * 
 * Channel Explorer - Browse joined Telegram channels and select one to view media
 */

import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Users, Lock, Hash, AlertCircle, Search, Filter, ArrowUpDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDownloadStore } from '../store/downloadStore'
import type { ChannelInfo } from '../types/global'

type FilterType = 'all' | 'public' | 'private'
type SortType = 'alphabetical' | 'members' | 'recent'

export function Channels(): JSX.Element {
  const { 
    auth, 
    channels, 
    setChannels, 
    setSelectedChannel, 
    setActivePage 
  } = useDownloadStore()
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [sortType, setSortType] = useState<SortType>('alphabetical')

  // Fetch channels on mount if authenticated
  useEffect(() => {
    if (auth.status === 'authenticated') {
      fetchChannels()
    }
  }, [auth.status])

  const fetchChannels = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const fetchedChannels = await window.tgfetch.channels.getJoined()
      setChannels(fetchedChannels)
      toast.success(`Found ${fetchedChannels.length} channels`)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch channels'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }, [setChannels])

  const handleChannelClick = (channel: ChannelInfo) => {
    setSelectedChannel(channel)
    setActivePage('media')
  }

  // Filter and sort channels
  const filteredAndSortedChannels = useMemo(() => {
    let filtered = channels

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(channel => 
        channel.title.toLowerCase().includes(query) ||
        channel.username?.toLowerCase().includes(query)
      )
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(channel => 
        filterType === 'private' ? channel.isPrivate : !channel.isPrivate
      )
    }

    // Apply sort
    const sorted = [...filtered]
    switch (sortType) {
      case 'alphabetical':
        sorted.sort((a, b) => a.title.localeCompare(b.title))
        break
      case 'members':
        sorted.sort((a, b) => (b.participantsCount || 0) - (a.participantsCount || 0))
        break
      case 'recent':
        // Keep original order (most recent from API)
        break
    }

    return sorted
  }, [channels, searchQuery, filterType, sortType])

  // Calculate statistics
  const stats = useMemo(() => {
    const total = channels.length
    const privateCount = channels.filter(c => c.isPrivate).length
    const publicCount = total - privateCount
    return { total, privateCount, publicCount }
  }, [channels])

  // Not authenticated
  if (auth.status !== 'authenticated') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="flex-1 flex items-center justify-center p-8"
      >
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/30 mb-4">
            <AlertCircle className="w-8 h-8 text-orange-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Not Connected
          </h3>
          <p className="text-white/50">
            Please connect to Telegram first to view your channels
          </p>
        </div>
      </motion.div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="flex-1 flex items-center justify-center"
      >
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-accent-blue animate-spin mx-auto mb-3" />
          <p className="text-sm text-white/50">Loading your channels...</p>
        </div>
      </motion.div>
    )
  }

  // Error state
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="flex-1 flex items-center justify-center p-8"
      >
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Failed to Load Channels
          </h3>
          <p className="text-white/50 mb-4">{error}</p>
          <button
            onClick={fetchChannels}
            className="px-4 py-2 rounded-xl bg-accent-blue/20 text-accent-blue hover:bg-accent-blue/30 transition-colors"
          >
            Try Again
          </button>
        </div>
      </motion.div>
    )
  }

  // Empty state
  if (channels.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="flex-1 flex items-center justify-center p-8"
      >
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 border border-white/10 mb-4">
            <Users className="w-8 h-8 text-white/40" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            No Channels Found
          </h3>
          <p className="text-white/50">
            You haven't joined any channels yet. Join some channels on Telegram and refresh.
          </p>
        </div>
      </motion.div>
    )
  }

  // Main channels grid view
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#0B1220] to-[#060B16] relative"
    >
      {/* Ambient glow effect */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
      
      {/* Header with search and filters */}
      <div className="px-8 py-6 border-b border-white/5 relative z-10">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-white">Your Channels</h2>
            <p className="text-sm text-white/60 mt-2">
              Explore and manage your Telegram channels
            </p>
          </div>
          <button
            onClick={fetchChannels}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-sm transition-all hover:scale-105"
          >
            Refresh
          </button>
        </div>

        {/* Statistics row */}
        <div className="flex items-center gap-4 mb-6">
          <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 backdrop-blur-xl">
            <span className="text-sm text-white/60">{stats.total} Channels</span>
          </div>
          <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 backdrop-blur-xl">
            <span className="text-sm text-white/60">{stats.privateCount} Private</span>
          </div>
          <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 backdrop-blur-xl">
            <span className="text-sm text-white/60">{stats.publicCount} Public</span>
          </div>
        </div>

        {/* Search and filters */}
        <div className="flex items-center gap-3">
          {/* Search bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>

          {/* Filter dropdown */}
          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer"
            >
              <option value="all">All Channels</option>
              <option value="public">Public Only</option>
              <option value="private">Private Only</option>
            </select>
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <select
              value={sortType}
              onChange={(e) => setSortType(e.target.value as SortType)}
              className="pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer"
            >
              <option value="alphabetical">A-Z</option>
              <option value="members">Most Members</option>
              <option value="recent">Recent</option>
            </select>
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Channel grid */}
      <div className="flex-1 overflow-y-auto p-8 relative z-10">
        {filteredAndSortedChannels.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Search className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/50">No channels found matching your filters</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredAndSortedChannels.map((channel, index) => (
              <motion.div
                key={channel.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.03 }}
              >
                <button
                  onClick={() => handleChannelClick(channel)}
                  className="w-full group"
                >
                  <div className="relative bg-[#111827] rounded-2xl p-6 border border-white/10 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] hover:border-blue-500/40">
                    {/* Channel avatar */}
                    <div className="mb-4">
                      {channel.avatar ? (
                        <img
                          src={channel.avatar}
                          alt={channel.title}
                          className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white/10 group-hover:ring-blue-400/50 transition-all duration-300"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 flex items-center justify-center ring-2 ring-white/10 group-hover:ring-blue-400/50 transition-all duration-300">
                          <span className="text-2xl font-bold text-white">
                            {channel.title.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Channel info */}
                    <h3 className="text-white font-semibold text-lg truncate mb-1 group-hover:text-blue-400 transition-colors">
                      {channel.title}
                    </h3>
                    
                    {channel.username && (
                      <p className="text-white/60 text-sm mb-3 truncate">
                        @{channel.username}
                      </p>
                    )}

                    {/* Stats and badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {channel.participantsCount && (
                          <div className="flex items-center gap-1.5 text-white/60 text-sm">
                            <Users className="w-4 h-4" />
                            <span>{formatNumber(channel.participantsCount)}</span>
                          </div>
                        )}
                      </div>
                      
                      {channel.isPrivate && (
                        <div className="text-xs bg-white/5 px-2 py-1 rounded-full text-white/60 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          <span>Private</span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// Helper to format numbers (1000 -> 1K)
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}
