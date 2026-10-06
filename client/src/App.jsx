import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from './context/AuthContext'
import { LanguageProvider } from './i18n/LanguageContext'
import { AdminRoute, GuestRoute, ProtectedRoute } from './components/RouteGuards'
import AppLayout from './components/AppLayout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import UploadSample from './pages/UploadSample'
import CropRecommendation from './pages/CropRecommendation'
import Reports from './pages/Reports'
import AdminRecords from './pages/AdminRecords'

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<GuestRoute />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/upload" element={<UploadSample />} />
                <Route path="/crops" element={<CropRecommendation />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
                <Route element={<AdminRoute />}>
                  <Route path="/admin/records" element={<AdminRecords />} />
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  )
}

export default App
