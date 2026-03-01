/**
 * src/components/InputField.tsx
 *
 * Floating-label input with animated focus glow.
 * Supports text, password, and custom right-side slot (e.g., show/hide button).
 */

import { useState, useId } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ReactNode } from 'react'

interface InputFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'password' | 'number'
  placeholder?: string
  disabled?: boolean
  error?: string
  hint?: string
  rightSlot?: ReactNode
  className?: string
  autoComplete?: string
}

export function InputField({
  label,
  value,
  onChange,
  type = 'text',
  disabled = false,
  error,
  hint,
  rightSlot,
  className = '',
  autoComplete,
}: InputFieldProps): JSX.Element {
  const [isFocused, setIsFocused] = useState(false)
  const id = useId()

  const isFloating = isFocused || value.length > 0

  return (
    <div className={`relative ${className}`}>
      <div
        className={`
          relative rounded-xl border transition-all duration-200
          ${error
            ? 'border-red-500/60 bg-red-500/5'
            : isFocused
            ? 'border-accent-blue/70 bg-background-elevated shadow-glow-blue'
            : 'border-white/10 bg-background-elevated hover:border-white/20'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {/* Floating label */}
        <motion.label
          htmlFor={id}
          animate={{
            top: isFloating ? '8px' : '50%',
            translateY: isFloating ? '0%' : '-50%',
            fontSize: isFloating ? '10px' : '13px',
            color: isFocused
              ? 'rgba(59,130,246,0.9)'
              : isFloating
              ? 'rgba(255,255,255,0.4)'
              : 'rgba(255,255,255,0.35)',
          }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="absolute left-3.5 pointer-events-none font-medium tracking-wide z-10"
          style={{ position: 'absolute' }}
        >
          {label}
        </motion.label>

        {/* Input */}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          autoComplete={autoComplete}
          className={`
            w-full bg-transparent text-white text-sm font-medium
            pt-[22px] pb-[8px] pl-3.5 outline-none
            ${rightSlot ? 'pr-10' : 'pr-3.5'}
            placeholder-transparent
          `}
          placeholder={label}
        />

        {/* Right slot (e.g., show/hide password button) */}
        {rightSlot && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightSlot}
          </div>
        )}

        {/* Focus ring glow */}
        <AnimatePresence>
          {isFocused && !error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 rounded-xl pointer-events-none"
              style={{
                boxShadow: '0 0 0 1px rgba(59,130,246,0.4), 0 0 16px rgba(59,130,246,0.08)',
              }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Error / hint text */}
      <AnimatePresence mode="wait">
        {error ? (
          <motion.p
            key="error"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-red-400 text-[11px] mt-1.5 ml-1 font-medium"
          >
            {error}
          </motion.p>
        ) : hint ? (
          <motion.p
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-white/30 text-[11px] mt-1.5 ml-1"
          >
            {hint}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
