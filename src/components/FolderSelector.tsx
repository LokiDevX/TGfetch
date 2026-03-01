/**
 * src/components/FolderSelector.tsx
 *
 * Styled folder picker that calls the native OS dialog via IPC.
 * Displays the selected path in muted text and allows clearing.
 */

import { motion } from 'framer-motion'
import { FolderOpen, X, FolderCheck } from 'lucide-react'

interface FolderSelectorProps {
  path: string
  onChange: (path: string) => void
  disabled?: boolean
  error?: string
}

export function FolderSelector({ path, onChange, disabled = false, error }: FolderSelectorProps): JSX.Element {
  async function handleSelect(): Promise<void> {
    if (disabled) return
    const selected = await window.tgfetch.dialog.openFolder()
    if (selected) {
      onChange(selected)
    }
  }

  function handleClear(e: React.MouseEvent): void {
    e.stopPropagation()
    onChange('')
  }

  const hasPath = path.length > 0

  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] text-white/40 font-semibold uppercase tracking-widest ml-0.5">
        Download Folder
      </label>

      <motion.button
        whileHover={!disabled ? { scale: 1.005 } : {}}
        whileTap={!disabled ? { scale: 0.998 } : {}}
        onClick={handleSelect}
        disabled={disabled}
        className={`
          w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left
          transition-all duration-200 group
          ${error
            ? 'border-red-500/50 bg-red-500/5'
            : hasPath
            ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50'
            : 'border-white/10 bg-background-elevated hover:border-white/20 hover:bg-white/5'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {/* Icon */}
        <div
          className={`
            shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
            transition-colors duration-200
            ${hasPath ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-white/40 group-hover:text-white/60'}
          `}
        >
          {hasPath ? (
            <FolderCheck className="w-4 h-4" />
          ) : (
            <FolderOpen className="w-4 h-4" />
          )}
        </div>

        {/* Path text */}
        <div className="flex-1 min-w-0">
          {hasPath ? (
            <>
              <p className="text-[11px] text-white/40 font-medium">Download location</p>
              <p className="text-sm text-white/70 font-mono truncate mt-0.5">{path}</p>
            </>
          ) : (
            <div>
              <p className="text-sm text-white/50 font-medium">Choose a folder…</p>
              <p className="text-[11px] text-white/25 mt-0.5">Click to open the folder picker</p>
            </div>
          )}
        </div>

        {/* Clear button */}
        {hasPath && !disabled && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleClear}
            className="shrink-0 p-1 rounded-md text-white/30 hover:text-white/60 hover:bg-white/10 transition-colors"
            title="Clear selection"
          >
            <X className="w-3.5 h-3.5" />
          </motion.button>
        )}
      </motion.button>

      {error && (
        <p className="text-red-400 text-[11px] ml-1 font-medium">{error}</p>
      )}
    </div>
  )
}
