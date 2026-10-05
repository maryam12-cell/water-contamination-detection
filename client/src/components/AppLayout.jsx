import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { Droplets, FileText, LayoutDashboard, LogOut, Menu, Settings, Sprout, Upload, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import RoleBadge from './RoleBadge'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/upload', label: 'Upload Sample', icon: Upload },
  { to: '/crops', label: 'Crop Recommendation', icon: Sprout },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function Brand() {
  return (
    <div className="flex items-center gap-2 font-bold text-sky-800">
      <Droplets className="h-6 w-6 text-sky-600" />
      <span>Water Detection</span>
    </div>
  )
}

function Sidebar({ onNavigate }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-16 items-center border-b border-slate-200 px-5">
        <Brand />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'bg-sky-100 text-sky-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className="mb-2 flex items-center justify-between gap-2 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <RoleBadge role={user.role} />
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          Logout
        </button>
      </div>
    </div>
  )
}

// Layout for all logged-in pages: fixed sidebar on desktop, slide-in drawer on mobile
export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)

  // Close on Escape and stop the page behind the drawer from scrolling
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false)
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <div className="min-h-screen bg-sky-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 lg:block">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-xl">
            <button
              onClick={() => setMenuOpen(false)}
              className="absolute right-3 top-4 z-10 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
          <button
            onClick={() => setMenuOpen(true)}
            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <Brand />
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
