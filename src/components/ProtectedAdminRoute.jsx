import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedAdminRoute() {
  const { loading, isAdmin } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="admin-shell">Verification des droits admin...</div>
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
