import React, { createContext, useContext, useState, useCallback } from 'react'

const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null)

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setDialog({
        title: options.title || 'Are you sure?',
        message: options.message || 'This action cannot be undone.',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        type: options.type || 'danger',
        onConfirm: () => {
          setDialog(null)
          resolve(true)
        },
        onCancel: () => {
          setDialog(null)
          resolve(false)
        },
      })
    })
  }, [])

  const handleConfirm = () => dialog?.onConfirm?.()
  const handleCancel = () => dialog?.onCancel?.()

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {dialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCancel} />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-6 transform transition-all">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
              dialog.type === 'danger' ? 'bg-red-100' :
              dialog.type === 'warning' ? 'bg-yellow-100' :
              dialog.type === 'success' ? 'bg-green-100' : 'bg-blue-100'
            }`}>
              <span className="text-2xl">
                {dialog.type === 'danger' ? '🗑' :
                 dialog.type === 'warning' ? '⚠' :
                 dialog.type === 'success' ? '✓' : 'ℹ'}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">{dialog.title}</h3>
            <p className="text-sm text-gray-500 text-center mb-6">{dialog.message}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                {dialog.cancelText}
              </button>
              <button
                onClick={handleConfirm}
                className={`px-4 py-2 rounded-lg text-sm text-white transition-colors ${
                  dialog.type === 'danger' ? 'bg-red-600 hover:bg-red-700' :
                  dialog.type === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700' :
                  dialog.type === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) throw new Error('useConfirm must be used within ConfirmProvider')
  return context.confirm
}
