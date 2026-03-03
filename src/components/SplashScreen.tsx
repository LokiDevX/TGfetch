/**
 * src/components/SplashScreen.tsx
 *
 * Premium splash screen that displays on app startup
 * Features fade-in/fade-out animation for a polished experience
 */

import { motion, AnimatePresence } from 'framer-motion'
import logoUrl from '../assets/logo.png'

interface SplashScreenProps {
  isVisible: boolean
}

export function SplashScreen({ isVisible }: SplashScreenProps): JSX.Element {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#1e293b] flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="flex flex-col items-center gap-6"
          >
            {/* Logo with glow effect */}
            <div className="relative">
              <div className="absolute inset-0 bg-accent-blue/30 blur-3xl rounded-full" />
              <img
                src={logoUrl}
                alt="TGfetch Logo"
                className="w-24 h-24 relative z-10 rounded-2xl shadow-2xl"
              />
            </div>

            {/* App name */}
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
                TG<span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-blue to-accent-cyan">fetch</span>
              </h1>
              <p className="text-white/50 text-sm font-medium">
                Telegram Media Manager
              </p>
              <p className="text-white/30 text-xs mt-2">
                By <span className="text-blue-400 font-medium">Loki</span>
              </p>
            </div>

            {/* Loading indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex gap-1.5 mt-4"
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.8, 0.3],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.15,
                  }}
                  className="w-2 h-2 rounded-full bg-accent-blue"
                />
              ))}
            </motion.div>

            {/* Back button */}
            <div className="mt-6">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="px-4 py-2 rounded-md bg-white/8 hover:bg-white/16 text-white/90 text-sm font-medium shadow-sm"
              >
                Back
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
