'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react'

const ToastContext = createContext(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}

const CONFIG = {
  success: { icon: <CheckCircle size={19} color="#16a34a" />, bg: '#f0fdf4', border: '#bbf7d0', bar: '#22c55e' },
  error:   { icon: <XCircle    size={19} color="#dc2626" />, bg: '#fef2f2', border: '#fecaca', bar: '#ef4444' },
  warning: { icon: <AlertTriangle size={19} color="#d97706" />, bg: '#fffbeb', border: '#fef3c7', bar: '#f59e0b' },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }, [])

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id))

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      <div style={{
        position: 'fixed',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        width: '92%',
        maxWidth: '420px',
        pointerEvents: 'none'
      }}>
        <AnimatePresence mode="popLayout">
          {toasts.map(toast => {
            const c = CONFIG[toast.type] || CONFIG.success
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: -20, scale: 0.92 }}
                animate={{ opacity: 1, y: 0,   scale: 1 }}
                exit={{    opacity: 0, scale: 0.9, transition: { duration: 0.18 } }}
                transition={{ type: 'spring', damping: 24, stiffness: 300 }}
                style={{
                  background: c.bg,
                  color: '#1a1a1a',
                  padding: '14px 16px',
                  borderRadius: '16px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  lineHeight: 1.4,
                  boxShadow: '0 8px 32px -4px rgba(0,0,0,0.14), 0 2px 8px -2px rgba(0,0,0,0.06)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  pointerEvents: 'all',
                  border: `1px solid ${c.border}`,
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{ flexShrink: 0, marginTop: '1px' }}>{c.icon}</div>

                <div style={{ flex: 1, paddingRight: '22px' }}>
                  {toast.message}
                </div>

                <motion.button
                  whileTap={{ scale: 0.82 }}
                  onClick={() => removeToast(toast.id)}
                  style={{
                    position: 'absolute', right: '10px', top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent', border: 'none',
                    color: '#9ca3af', cursor: 'pointer',
                    display: 'flex', padding: '4px', borderRadius: '6px'
                  }}
                >
                  <X size={14} />
                </motion.button>

                {/* Countdown bar */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0,
                  height: '3px',
                  background: c.bar,
                  animation: 'toastProgress 4.5s linear forwards',
                  borderRadius: '0 0 0 16px'
                }} />
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
