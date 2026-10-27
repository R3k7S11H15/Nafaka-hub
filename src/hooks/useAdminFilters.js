import { useState, useCallback } from 'react'
import storage from '../utils/storage'

export function useAdminFilters(storageKey) {
  const [filters, setFilters] = useState(() => {
    try {
      const saved = storage.getItem(storageKey)
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  const updateFilter = useCallback((key, value) => {
    setFilters(prev => {
      const next = { ...prev, [key]: value }
      storage.setItem(storageKey, JSON.stringify(next))
      return next
    })
  }, [storageKey])

  const clearFilters = useCallback(() => {
    setFilters({})
    storage.removeItem(storageKey)
  }, [storageKey])

  return { filters, updateFilter, clearFilters }
}
