import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { ROLES } from '../config/roles'
import storage from '../utils/storage'

const AuthContext = createContext()
export { AuthContext }
export { ROLES }

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [pendingApproval, setPendingApproval] = useState(false)
  const [error, setError] = useState(null)

  const fetchProfile = useCallback(async () => {
    try {
      setError(null)
      const data = await api.getProfile()
      if (data.success && data.profile) {
        setUser({
          id: data.profile.id,
          name: data.profile.name,
          email: data.profile.email,
          phone: data.profile.phone,
          role: data.profile.role || ROLES.CUSTOMER,
        })
        setIsAuthenticated(true)
      } else {
        setUser(null)
        setIsAuthenticated(false)
        if (data.error === 'TOKEN_EXPIRED' || data.status === 401) {
          await storage.removeItem('auth_token')
        } else {
          setError(data.message || 'Failed to load profile')
        }
      }
    } catch (err) {
      setUser(null)
      setIsAuthenticated(false)
      const message = (err && err.message) || 'Network error'
      const isAuthError = message.includes('401') || message.includes('Unauthorized')
      if (isAuthError) {
        await storage.removeItem('auth_token')
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const login = async (email, password) => {
    setError(null)
    try {
      const data = await api.login(email, password)
      if (data.success && data.customer) {
        setUser({
          id: data.customer.id,
          name: data.customer.full_name,
          email: data.customer.email,
          phone: data.customer.phone,
          role: data.customer.role || ROLES.CUSTOMER,
        })
        setIsAuthenticated(true)
        setPendingApproval(!!data.pending_approval)
      } else {
        setError(data.message || 'Login failed')
      }
      return data
    } catch (err) {
      setError((err && err.message) || 'Network error')
      throw err
    }
  }

  const register = async (full_name, phone, email, shipping_address, password, role = 'customer', extra = {}) => {
    setError(null)
    try {
      const data = await api.register(full_name, phone, email, shipping_address, password, role, extra)
      if (data.success && data.customer) {
        setUser({
          id: data.customer.id,
          name: data.customer.full_name,
          email: data.customer.email,
          phone: data.customer.phone,
          role: data.customer.role || ROLES.CUSTOMER,
        })
        setIsAuthenticated(true)
        setPendingApproval(!!data.pending_approval)
      } else {
        setError(data.message || 'Registration failed')
      }
      return data
    } catch (err) {
      setError((err && err.message) || 'Network error')
      throw err
    }
  }

  const logout = async () => {
    try {
      await api.logout()
    } catch (e) {
      // Clear local state regardless of backend response
    } finally {
      setUser(null)
      setIsAuthenticated(false)
      setPendingApproval(false)
      setError(null)
      await storage.removeItem('auth_token')
      await storage.removeItem('csrf_token')
    }
  }

  const refetchProfile = useCallback(async () => {
    await fetchProfile()
  }, [fetchProfile])

  const value = {
    user,
    loading,
    isAuthenticated,
    pendingApproval,
    error,
    login,
    register,
    logout,
    refetchProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
