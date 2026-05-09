import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAdminAuth } from '../contexts/AdminAuthContext'
import LoadingScreen from './LoadingScreen'

export default function ProtectedRoute({
  children,
}: {
  children: ReactNode
}) {
  const { user, bootstrapping } = useAdminAuth()
  const location = useLocation()

  if (bootstrapping) {
    return <LoadingScreen />
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}
