import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../context/AuthContext'

function FullPageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-sky-50 text-slate-500">
      Loading...
    </div>
  )
}

// Only logged-in users can see these routes
export function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) return <FullPageLoader />
  return user ? <Outlet /> : <Navigate to="/login" replace />
}

// Login/Register pages: logged-in users are sent straight to the dashboard
export function GuestRoute() {
  const { user, loading } = useAuth()
  if (loading) return <FullPageLoader />
  return user ? <Navigate to="/dashboard" replace /> : <Outlet />
}
