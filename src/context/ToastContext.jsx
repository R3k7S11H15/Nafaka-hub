import { useState, useEffect, useCallback, createContext, useContext } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random()
    const normalized = typeof toast === 'string' ? { message: toast, type: 'info' } : {
      id,
      type: toast.type || 'info',
      title: toast.title || '',
      message: toast.message || '',
      duration: toast.duration ?? 4000,
      action: toast.action || null,
    }
    setToasts(prev => [...prev, normalized])
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const success = useCallback((title, message, options) => addToast({ type: 'success', title, message, ...options }), [addToast])
  const error = useCallback((title, message, options) => addToast({ type: 'error', title, message, duration: 6000, ...options }), [addToast])
  const warning = useCallback((title, message, options) => addToast({ type: 'warning', title, message, ...options }), [addToast])
  const info = useCallback((title, message, options) => addToast({ type: 'info', title, message, ...options }), [addToast])

  return (
    <ToastContext.Provider value={{ addToast, removeToast, success, error, warning, info }}>
      {children}
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 400, width: '100%' }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            style={{
              padding: '12px 16px',
              borderRadius: 8,
              color: '#fff',
              fontSize: 14,
              fontWeight: 500,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              cursor: 'pointer',
              minWidth: 240,
              animation: 'toastSlideIn 0.3s ease-out',
              backgroundColor:
                toast.type === 'success' ? '#16a34a' :
                toast.type === 'error' ? '#dc2626' :
                toast.type === 'warning' ? '#d97706' :
                toast.type === 'info' ? '#2563eb' : '#15803d',
            }}
          >
            {toast.title && <div style={{ fontWeight: 600, marginBottom: 2 }}>{toast.title}</div>}
            {toast.message}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toastSlideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
