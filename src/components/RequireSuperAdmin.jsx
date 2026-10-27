import { useContext } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import { isSuperAdmin } from '../config/roles'

export default function RequireSuperAdmin({ children }) {
  const { user, loading } = useContext(AuthContext)
  const location = useLocation()

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!user || !isSuperAdmin(user.role)) {
    return <Navigate to="/dashboard" state={{ from: location.pathname }} replace />
  }

  return children
}
