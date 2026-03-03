/**
 * src/components/ApiSetupScreen.tsx
 *
 * One-time setup screen for Telegram API credentials.
 * Shown when TG_API_ID and TG_API_HASH are not configured.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Key, Hash, ShieldCheck, ExternalLink, Loader2, AlertCircle } from 'lucide-react'
import { InputField } from './InputField'

interface ApiSetupScreenProps {
  onComplete: () => void
}

export function ApiSetupScreen({ onComplete }: ApiSetupScreenProps): JSX.Element {
  const [apiId, setApiId] = useState('')
  const [apiHash, setApiHash] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    
    const numericApiId = parseInt(apiId.trim(), 10)
    
    if (isNaN(numericApiId)) {
      setError('API ID must be a number')
      return
    }

    if (!apiHash.trim()) {
      setError('API Hash is required')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await window.tgfetch.auth.setCredentials(numericApiId, apiHash.trim())
      if (result.success) {
        onComplete()
      } else {
        setError(result.error || 'Failed to save credentials')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950 flex items-center justify-center p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-slate-900 border border-white/10 rounded-3xl shadow-2xl p-8"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4">
            <ShieldCheck className="w-8 h-8 text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">API Configuration</h2>
          <p className="text-slate-400 text-center text-sm">
            To use TGfetch, you need to provide your Telegram API credentials. 
            These are stored locally on your machine.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <InputField
              label="API ID"
              icon={<Hash className="w-4 h-4" />}
              placeholder="e.g. 12345678"
              value={apiId}
              onChange={setApiId}
              type="text"
              required
            />

            <InputField
              label="API HASH"
              icon={<Key className="w-4 h-4" />}
              placeholder="e.g. 1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p"
              value={apiHash}
              onChange={setApiHash}
              type="text"
              required
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving Configuration...
              </>
            ) : (
              'Save & Continue'
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col items-center gap-4">
          <p className="text-xs text-slate-500">Don't have API credentials?</p>
          <button
            type="button"
            onClick={() => window.tgfetch.shell.openExternal('https://my.telegram.org/auth?to=apps')}
            className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Get them at my.telegram.org <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </motion.div>
    </div>
  )
}
