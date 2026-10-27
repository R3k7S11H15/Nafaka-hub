import { useEffect, useContext } from 'react'
import { Alert } from 'react-native'
import { AuthContext } from '../../../src/context/AuthContext'
import { isAdminRole } from '../../../src/config/roles'

export const useAdminGuard = (allowedRoles = null) => {
  const { user } = useContext(AuthContext)

  const hasAccess = allowedRoles
    ? allowedRoles.includes(user?.role)
    : isAdminRole(user?.role)

  useEffect(() => {
    if (!hasAccess) {
      Alert.alert('Access Denied', 'You do not have permission to access this page.')
    }
  }, [hasAccess])

  return hasAccess
}
