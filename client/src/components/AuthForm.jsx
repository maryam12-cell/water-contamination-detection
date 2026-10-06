import { useState } from 'react'
import { useLanguage } from '../i18n/LanguageContext'
import LanguageToggle from './LanguageToggle'

// Shared card layout and inputs for the Login and Register pages
export function AuthCard({ title, subtitle, children }) {
  return (
    <main className="min-h-screen bg-sky-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-8">
        <LanguageToggle className="mb-6 justify-end" />
        <h1 className="text-2xl font-bold text-sky-800 text-center">{title}</h1>
        <p className="mt-1 text-sm text-slate-500 text-center">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
    </main>
  )
}

export function Field({ label, type = 'text', ...inputProps }) {
  const { t } = useLanguage()
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'

  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="relative mt-1">
        <input
          {...inputProps}
          type={isPassword && showPassword ? 'text' : type}
          dir={type === 'email' ? 'ltr' : undefined}
          className={`w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 ${isPassword ? 'pe-20' : ''}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 end-0 px-3 text-sm font-medium text-sky-700 hover:text-sky-900"
          >
            {showPassword ? t('auth.hide') : t('auth.show')}
          </button>
        )}
      </div>
    </label>
  )
}

export function ErrorMessage({ children }) {
  if (!children) return null
  return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{children}</p>
}

export function SubmitButton({ loading, children }) {
  const { t } = useLanguage()
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full rounded-lg bg-sky-700 py-2.5 font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
    >
      {loading ? t('common.pleaseWait') : children}
    </button>
  )
}
