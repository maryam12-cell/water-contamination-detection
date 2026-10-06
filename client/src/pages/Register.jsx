import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../i18n/LanguageContext'
import { AuthCard, Field, ErrorMessage, SubmitButton } from '../components/AuthForm'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Register() {
  const { register } = useAuth()
  const { t, tError } = useLanguage()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.name.trim() || !form.email.trim() || !form.password) return setError(t('error.nameEmailPasswordRequired'))
    if (!EMAIL_RE.test(form.email.trim())) return setError(t('error.invalidEmail'))
    if (form.password.length < 8) return setError(t('auth.passwordTooShort'))
    if (form.password !== form.confirm) return setError(t('auth.passwordMismatch'))

    setLoading(true)
    try {
      await register(form.name, form.email, form.password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(tError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard title={t('auth.createAccount')} subtitle={t('auth.registerSubtitle')}>
      {/* noValidate: we show our own messages in the chosen language instead of the browser's popups */}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <ErrorMessage>{error}</ErrorMessage>
        <Field label={t('auth.fullName')} value={form.name} onChange={update('name')} required autoComplete="name" />
        <Field label={t('auth.email')} type="email" value={form.email} onChange={update('email')} required autoComplete="email" />
        <Field label={t('auth.password')} type="password" value={form.password} onChange={update('password')} required minLength={8} autoComplete="new-password" />
        <Field label={t('auth.confirmPassword')} type="password" value={form.confirm} onChange={update('confirm')} required autoComplete="new-password" />
        <SubmitButton loading={loading}>{t('auth.register')}</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        {t('auth.haveAccount')}{' '}
        <Link to="/login" className="font-semibold text-sky-700 hover:underline">{t('auth.login')}</Link>
      </p>
    </AuthCard>
  )
}
