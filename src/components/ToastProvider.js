'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react'

const ToastContext = createContext(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4500)
  }, [])

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id))

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle size={20} color="#22c55e" />
      case 'error': return <XCircle size={20} color="#ef4444" />
      case 'warning': return <AlertTriangle size={20} color="#f59e0b" />
      default: return null
    }
  }

  const getBgColor = (type) => {
    switch (type) {
      case 'success': return '#f0fdf4'
      case 'error': return '#fef2f2'
      case 'warning': return '#fffbeb'
      default: return '#ffffff'
    }
  }

  const getBorderColor = (type) => {
    switch (type) {
      case 'success': return '#bcf0da'
      case 'error': return '#fecaca'
      case 'warning': return '#fef3c7'
      default: return '#e5e7eb'
    }
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Container */}
      <div style={{
        position: 'fixed',
        top: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '90%',
        maxWidth: '420px',
        pointerEvents: 'none'
      }}>
        {toasts.map(toast => (
          <div key={toast.id} style={{
            background: getBgColor(toast.type),
            color: '#1f2937',
            padding: '16px 20px',
            borderRadius: '16px',
            fontSize: '0.95rem',
            fontWeight: '600',
            boxShadow: '0 12px 30px -5px rgba(0,0,0,0.15), 0 4px 10px -2px rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            pointerEvents: 'all',
            animation: 'toastIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            border: `1px solid ${getBorderColor(toast.type)}`,
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {getIcon(toast.type)}
            </div>
            <div style={{ flex: 1, paddingRight: '20px' }}>
              {toast.message}
            </div>
            <button 
              onClick={() => removeToast(toast.id)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: '#9ca3af',
                cursor: 'pointer',
                display: 'flex',
                padding: '4px'
              }}
            >
              <X size={16} />
            </button>
            {/* Progress Bar (Visual only) */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              height: '3px',
              background: toast.type === 'error' ? '#ef4444' : toast.type === 'warning' ? '#f59e0b' : '#22c55e',
              animation: 'toastProgress 4.5s linear forwards'
            }} />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(-20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes toastProgress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </ToastContext.Provider>
  )
}
