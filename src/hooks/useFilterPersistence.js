import { useEffect, useRef } from 'react'
import storage from '../utils/storage'

export function useFilterPersistence(key, defaultValue) {
  const keyRef = useRef(key)
  const defaultRef = useRef(defaultValue)

  useEffect(() => {
    const saved = storage.getItem(`filters_${key}`)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        return parsed
      } catch (e) {}
    }
    return defaultValue
  }, [key])

  const saveFilters = (filters) => {
    storage.setItem(`filters_${key}`, JSON.stringify(filters))
  }

  const clearFilters = () => {
    storage.removeItem(`filters_${key}`)
  }

  return { saveFilters, clearFilters }
}
