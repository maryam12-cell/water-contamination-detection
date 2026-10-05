import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from './context/AuthContext'
import { GuestRoute, ProtectedRoute } from './components/RouteGuards'
import AppLayout from './components/AppLayout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import UploadSample from './pages/UploadSample'
import ComingSoon from './pages/ComingSoon'

function App() {
  return (
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
              <Route
                path="/crops"
                element={<ComingSoon title="Crop Recommendation" description="Crops suited to your water quality." />}
              />
              <Route
                path="/reports"
                element={<ComingSoon title="Reports" description="History of your samples and analysis results." />}
              />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
