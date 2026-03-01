/**
 * src/components/AuthDialog.tsx
 *
 * Modal dialog for interactive Telegram authentication steps:
 *   - Phone number entry
 *   - Verification code entry
 *   - 2FA password entry
 *
 * Displayed when the main process requests these inputs during auth.
 */

import { motion, AnimatePresence } from 'framer-motion'
import { Phone, Hash, Lock, Send } from 'lucide-react'
import { useDownloadStore } from '../store/downloadStore'
import { InputField } from './InputField'

const STEP_CONFIG = {
  phone: {
    title: 'Phone Number',
    description: 'Enter your Telegram phone number with country code (e.g. +14155552671)',
    icon: <Phone className="w-5 h-5" />,
    placeholder: '+1 415 555 2671',
  },
  code: {
    title: 'Verification Code',
    description: 'Enter the code sent to your Telegram app.',
    icon: <Hash className="w-5 h-5" />,
    placeholder: '12345',
  },
  password: {
    title: '2FA Password',
    description: 'Your account has two-factor authentication. Enter your password.',
    icon: <Lock className="w-5 h-5" />,
    placeholder: '••••••••',
  },
}

export function AuthDialog(): JSX.Element {
  const { auth, showAuthDialog, setShowAuthDialog, authDialogInput, setAuthDialogInput } =
    useDownloadStore()

  const step = auth.pendingAction

  function handleSubmit(): void {
    if (!step || !authDialogInput.trim()) return

    if (step === 'phone') {
      window.tgfetch.auth.respondPhone(authDialogInput.trim())
    } else if (step === 'code') {
      window.tgfetch.auth.respondCode(authDialogInput.trim())
    } else if (step === 'password') {
      window.tgfetch.auth.respondPassword(authDialogInput.trim())
    }

    setAuthDialogInput('')
    setShowAuthDialog(false)
  }

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === 'Enter') handleSubmit()
    if (e.key === 'Escape') setShowAuthDialog(false)
  }

  const config = step ? STEP_CONFIG[step] : null

  return (
    <AnimatePresence>
      {showAuthDialog && config && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={() => setShowAuthDialog(false)}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: -12 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="bg-background-card border border-white/10 rounded-2xl shadow-elevated p-6">
              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-blue/20 to-accent-cyan/20 border border-accent-blue/30 flex items-center justify-center text-accent-blue">
                  {config.icon}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">{config.title}</h3>
                  <p className="text-xs text-white/40 mt-0.5">{config.description}</p>
                </div>
              </div>

              {/* Input */}
              <InputField
                label={config.title}
                value={authDialogInput}
                onChange={setAuthDialogInput}
                type={step === 'password' ? 'password' : 'text'}
                autoComplete={step === 'password' ? 'current-password' : 'off'}
                className="mb-4"
              />

              {/* Actions */}
              <div className="flex gap-3" onKeyDown={handleKeyDown}>
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowAuthDialog(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 text-sm font-medium hover:text-white/70 hover:bg-white/5 transition-colors"
                >
                  Cancel
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSubmit}
                  disabled={!authDialogInput.trim()}
                  className={`
                    flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold
                    transition-all duration-200
                    ${authDialogInput.trim()
                      ? 'bg-gradient-to-r from-accent-blue to-accent-cyan text-white shadow-glow-blue hover:shadow-glow-cyan'
                      : 'bg-white/5 text-white/25 cursor-not-allowed'
                    }
                  `}
                >
                  <Send className="w-4 h-4" />
                  Submit
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
