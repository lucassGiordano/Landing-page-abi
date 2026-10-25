import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function RequireAdmin() {
  const { user, loading, profileLoading, isAdmin } = useAuth()
  const location = useLocation()

  if (loading || profileLoading) return <p>Cargando...</p>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!isAdmin) return <Navigate to="/" replace />
  return <Outlet />
}