import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

export function useAdminData(endpoint, initialData = []) {
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async (params = {}) => {
    try {
      const result = await api.get(endpoint, params)
      setData(result?.data || result || [])
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to fetch data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [endpoint])

  const refresh = useCallback(() => {
    setRefreshing(true)
    setLoading(true)
    return fetchData()
  }, [fetchData])

  useEffect(() => { fetchData() }, [fetchData])

  return { data, loading, error, refreshing, refresh, setData }
}

export function useAdminMutation(mutationFn) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const mutate = useCallback(async (...args) => {
    setLoading(true)
    setError(null)
    try {
      const result = await mutationFn(...args)
      return result
    } catch (err) {
      setError(err.message || 'Operation failed')
      throw err
    } finally {
      setLoading(false)
    }
  }, [mutationFn])

  return { mutate, loading, error }
}
