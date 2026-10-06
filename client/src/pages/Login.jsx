import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../i18n/LanguageContext'
import { AuthCard, Field, ErrorMessage, SubmitButton } from '../components/AuthForm'

export default function Login() {
  const { login } = useAuth()
  const { t, tError } = useLanguage()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password) return setError(t('error.emailPasswordRequired'))
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(tError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard title={t('auth.welcomeBack')} subtitle={t('auth.loginSubtitle')}>
      {/* noValidate: we show our own messages in the chosen language instead of the browser's popups */}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <ErrorMessage>{error}</ErrorMessage>
        <Field label={t('auth.email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        <Field label={t('auth.password')} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        <SubmitButton loading={loading}>{t('auth.login')}</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        {t('auth.noAccount')}{' '}
        <Link to="/register" className="font-semibold text-sky-700 hover:underline">{t('auth.register')}</Link>
      </p>
    </AuthCard>
  )
}
