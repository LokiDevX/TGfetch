/**
 * src/components/AuthDialog.tsx
 *
 * Modal dialog for interactive Telegram authentication:
 *   - QR code login (default)
 *   - Phone number entry (fallback)
 *   - Verification code entry
 *   - 2FA password entry
 *
 * Automatically displays based on auth status from main process.
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, Hash, Lock, Send, CheckCircle2, QrCode, Smartphone, ArrowLeft, X } from 'lucide-react'
import { useDownloadStore } from '../store/downloadStore'
import { InputField } from './InputField'
import type { AuthStatus } from '../types/global'

const STEP_CONFIG: Record<'phone' | 'code' | 'password', {
  title: string
  description: string
  icon: JSX.Element
  placeholder: string
  inputType: 'text' | 'password'
  autoComplete: string
}> = {
  phone: {
    title: 'Phone Number',
    description: 'Enter your Telegram phone number with country code',
    icon: <Phone className="w-5 h-5" />,
    placeholder: '+1 415 555 2671',
    inputType: 'text',
    autoComplete: 'tel',
  },
  code: {
    title: 'Verification Code',
    description: 'Enter the code sent to your Telegram app',
    icon: <Hash className="w-5 h-5" />,
    placeholder: '12345',
    inputType: 'text',
    autoComplete: 'one-time-code',
  },
  password: {
    title: '2FA Password',
    description: 'Enter your two-factor authentication password',
    icon: <Lock className="w-5 h-5" />,
    placeholder: '••••••••',
    inputType: 'password',
    autoComplete: 'current-password',
  },
}

export function AuthDialog(): JSX.Element {
  const { auth, setAuth, authView, setAuthView } = useDownloadStore()
  const [input, setInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSwitching, setIsSwitching] = useState(false)

  // Determine which view to show
  const isQRMode = authView === 'qr' || auth.status === 'qr_waiting' || auth.status === 'qr_scanned'
  const isExpired = auth.status === 'expired'

  const currentStep: 'phone' | 'code' | 'password' | null = 
    auth.status === 'waiting_for_phone' ? 'phone' :
    auth.status === 'waiting_for_code' ? 'code' :
    auth.status === 'waiting_for_password' ? 'password' :
    null

  const showDialog = authView !== 'initial' || isQRMode || isExpired || currentStep !== null
  const config = currentStep ? STEP_CONFIG[currentStep] : null

  // Clear input when dialog closes or step changes
  useEffect(() => {
    if (!showDialog) {
      setInput('')
      setIsSubmitting(false)
      setIsSwitching(false)
    }
  }, [showDialog, currentStep])

  async function handleSwitchToPhone(): Promise<void> {
    if (isSwitching) return
    setIsSwitching(true)
    try {
      await window.tgfetch.auth.connect()
    } catch (err) {
      console.error('Failed to switch to phone login:', err)
    } finally {
      setIsSwitching(false)
    }
  }

  async function handleSwitchToQR(): Promise<void> {
    if (isSwitching) return
    setIsSwitching(true)
    try {
      // ensure UI is showing QR view
      setAuthView('qr')
      await window.tgfetch.auth.connectWithQR()
    } catch (err) {
      console.error('Failed to switch to QR login:', err)
    } finally {
      setIsSwitching(false)
    }
  }

  function handleClose(): void {
    // Ensure QR login is cancelled and state reset
    try { window.tgfetch.cancelQrLogin() } catch {}
    setAuth({ status: 'idle', qrCode: undefined, error: undefined })
    setAuthView('initial')
    setInput('')
    setIsSubmitting(false)
    setIsSwitching(false)
  }

  async function handleBack(): Promise<void> {
    // Going back from QR should cancel polling and reset auth view
    try { await window.tgfetch.cancelQrLogin() } catch (err) {
      console.warn('cancelQrLogin failed', err)
    }
    setAuth({ status: 'idle', qrCode: undefined, error: undefined })
    setAuthView('initial')
    setInput('')
    setIsSubmitting(false)
    setIsSwitching(false)
  }

  async function handleSubmit(): Promise<void> {
    if (!currentStep || !input.trim() || isSubmitting) return

    setIsSubmitting(true)

    try {
      if (currentStep === 'phone') {
        await window.tgfetch.auth.submitPhone(input.trim())
      } else if (currentStep === 'code') {
        await window.tgfetch.auth.submitCode(input.trim())
      } else if (currentStep === 'password') {
        await window.tgfetch.auth.submitPassword(input.trim())
      }

      setInput('')
    } catch (err) {
      console.error('Auth submission error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === 'Enter' && !isSubmitting) {
      handleSubmit()
    }
  }

  // Render QR Code view or expired
  if (isQRMode || isExpired) {
    return (
      <AnimatePresence>
        {showDialog && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={handleClose}
            />

            {/* Dialog */}
            <motion.div
              key={isQRMode ? 'qr' : 'qr-expired'}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="bg-background-card border border-white/10 rounded-2xl shadow-elevated p-6">
                {/* Header with Back and Close */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleBack}
                      className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
                    >
                      <ArrowLeft size={16} />
                      Back
                    </motion.button>
                  </div>
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-blue/20 to-accent-cyan/20 border border-accent-blue/30 mb-1">
                      <QrCode className="w-6 h-6 text-accent-blue" />
                    </div>
                    <h3 className="text-base font-semibold text-white mb-1.5">Scan with Telegram to Login</h3>
                  </div>
                  <div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleClose}
                      className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all"
                      title="Close"
                    >
                      <X className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>

                <p className="text-xs text-white/50 mb-4">Open Telegram → Settings → Devices → Scan QR</p>

                {/* QR Code */}
                {auth.qrCode && !isExpired && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center justify-center mb-4"
                  >
                    <div className="p-3 bg-white rounded-xl shadow-xl">
                      <img 
                        src={auth.qrCode} 
                        alt="QR Code" 
                        className="w-48 h-48"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Expired message */}
                {isExpired && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mb-4 p-3 rounded-xl bg-orange-500/10 border border-orange-500/30"
                  >
                    <p className="text-xs text-orange-400 text-center">
                      QR code expired. Please try again.
                    </p>
                  </motion.div>
                )}

                {/* Status indicator */}
                {auth.status === 'qr_waiting' && (
                  <div className="flex items-center justify-center gap-2 text-xs text-white/40 mb-4">
                    <div className="w-2 h-2 rounded-full bg-accent-blue animate-pulse" />
                    Waiting for scan...
                  </div>
                )}

                {/* Fallback button */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSwitchToPhone}
                  disabled={isSwitching}
                  className="w-full py-2.5 rounded-xl text-sm text-white/50 hover:text-white/70 hover:bg-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-center gap-2">
                    {isSwitching ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                        Switching...
                      </>
                    ) : (
                      <>
                        <Phone className="w-4 h-4" />
                        Use phone number instead
                      </>
                    )}
                  </div>
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    )
  }

  // Render phone/code/password view
  return (
    <AnimatePresence>
      {showDialog && config && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: -12 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="bg-background-card border border-white/10 rounded-2xl shadow-elevated p-6">
              {/* Header with Back Button */}
              <div className="flex items-center gap-3 mb-5">
                {currentStep === 'phone' && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSwitchToQR}
                    disabled={isSwitching}
                    className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    title="Back to QR Code"
                  >
                    {isSwitching ? (
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                    ) : (
                      <ArrowLeft className="w-4 h-4" />
                    )}
                  </motion.button>
                )}
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-blue/20 to-accent-cyan/20 border border-accent-blue/30 flex items-center justify-center text-accent-blue">
                  {config.icon}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">{config.title}</h3>
                  <p className="text-xs text-white/40 mt-0.5">{config.description}</p>
                </div>
              </div>

              {/* Input */}
              <div onKeyDown={handleKeyDown}>
                <InputField
                  label={config.title}
                  value={input}
                  onChange={setInput}
                  type={config.inputType}
                  autoComplete={config.autoComplete}
                  placeholder={config.placeholder}
                  className="mb-4"
                  disabled={isSubmitting}
                />
              </div>

              {/* Error display */}
              {auth.error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30"
                >
                  <p className="text-xs text-red-400">{auth.error}</p>
                </motion.div>
              )}

              {/* Submit button */}
              <motion.button
                whileHover={!isSubmitting && input.trim() ? { scale: 1.02 } : {}}
                whileTap={!isSubmitting && input.trim() ? { scale: 0.97 } : {}}
                onClick={handleSubmit}
                disabled={!input.trim() || isSubmitting}
                className={`
                  w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold
                  transition-all duration-200
                  ${input.trim() && !isSubmitting
                    ? 'bg-gradient-to-r from-accent-blue to-accent-cyan text-white shadow-glow-blue hover:shadow-glow-cyan'
                    : 'bg-white/5 text-white/25 cursor-not-allowed'
                  }
                `}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit
                  </>
                )}
              </motion.button>

              {/* Help text */}
              <p className="text-center text-xs text-white/30 mt-3">
                {currentStep === 'phone' && 'Include country code (e.g., +1 for US)'}
                {currentStep === 'code' && 'Check your Telegram app for the code'}
                {currentStep === 'password' && 'This is your cloud password, not OTP'}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}