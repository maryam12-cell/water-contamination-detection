import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { Database, Droplets, FileText, LayoutDashboard, LogOut, Menu, Settings, Sprout, Upload, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../i18n/LanguageContext'
import RoleBadge from './RoleBadge'
import LanguageToggle from './LanguageToggle'

const NAV_ITEMS = [
  { to: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/upload', labelKey: 'nav.upload', icon: Upload },
  { to: '/crops', labelKey: 'nav.crops', icon: Sprout },
  { to: '/reports', labelKey: 'nav.reports', icon: FileText },
  { to: '/admin/records', labelKey: 'nav.records', icon: Database, adminOnly: true },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
]

function Brand() {
  const { t } = useLanguage()
  return (
    <div className="flex items-center gap-2 font-bold text-sky-800">
      <Droplets className="h-6 w-6 shrink-0 text-sky-600" />
      <span>{t('app.name')}</span>
    </div>
  )
}

function Sidebar({ onNavigate }) {
  const { user, logout } = useAuth()
  const { t } = useLanguage()
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
        {NAV_ITEMS.filter((item) => !item.adminOnly || user.role === 'admin').map(({ to, labelKey, icon: Icon }) => (
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
            {t(labelKey)}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <LanguageToggle className="mb-2 px-3 py-1" />
        <div className="mb-2 flex items-center justify-between gap-2 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">{user.name}</p>
            <p className="font-latin truncate text-xs text-slate-500" dir="ltr">{user.email}</p>
          </div>
          <RoleBadge role={user.role} />
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          <LogOut className="h-5 w-5 shrink-0 rtl:-scale-x-100" />
          {t('nav.logout')}
        </button>
      </div>
    </div>
  )
}

// Layout for all logged-in pages: fixed sidebar on desktop, slide-in drawer on mobile.
// Uses start/end classes so the sidebar moves to the right in Urdu (right-to-left).
export default function AppLayout() {
  const { t } = useLanguage()
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
      <aside className="fixed inset-y-0 start-0 hidden w-64 border-e border-slate-200 lg:block">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 start-0 w-72 max-w-[85vw] shadow-xl">
            <button
              onClick={() => setMenuOpen(false)}
              className="absolute end-3 top-4 z-10 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              aria-label={t('nav.closeMenu')}
            >
              <X className="h-5 w-5" />
            </button>
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:ps-64">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
          <button
            onClick={() => setMenuOpen(true)}
            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
            aria-label={t('nav.openMenu')}
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
