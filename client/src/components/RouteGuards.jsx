import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../i18n/LanguageContext'

function FullPageLoader() {
  const { t } = useLanguage()
  return (
    <div className="min-h-screen flex items-center justify-center bg-sky-50 text-slate-500">
      {t('common.loading')}
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

// Admin-only pages. Normal users are sent to the dashboard; the API also returns 403 for them.
export function AdminRoute() {
  const { user } = useAuth()
  return user?.role === 'admin' ? <Outlet /> : <Navigate to="/dashboard" replace />
}
