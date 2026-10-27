import { useState, useEffect } from 'react'
import storage from '../utils/storage'

const DEFAULT_FLAGS = {
  new_dashboard: true,
  mobile_admin: true,
  promotions: true,
  tax_management: true,
  category_attributes: true,
  content_moderation: true,
  dispute_resolution: true,
  vendor_analytics: true,
  email_sms_templates: true,
  webhook_monitoring: true,
  redis_cache: false,
  advanced_analytics: false,
  multi_language: false,
  dark_mode: false,
}

export function useFeatureFlags() {
  const [flags, setFlags] = useState(DEFAULT_FLAGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadFlags = async () => {
      try {
        const saved = await storage.getItem('feature_flags')
        if (saved) {
          setFlags({ ...DEFAULT_FLAGS, ...JSON.parse(saved) })
        }
      } catch (err) {
        console.error('Failed to load feature flags:', err)
      } finally {
        setLoading(false)
      }
    }
    loadFlags()
  }, [])

  const isEnabled = useCallback((flag) => {
    return flags[flag] === true
  }, [flags])

  const toggleFlag = useCallback(async (flag, value) => {
    const next = { ...flags, [flag]: value }
    setFlags(next)
    try {
      await storage.setItem('feature_flags', JSON.stringify(next))
    } catch (err) {
      console.error('Failed to save feature flags:', err)
    }
  }, [flags])

  return { flags, isEnabled, toggleFlag, loading, setFlags }
}
