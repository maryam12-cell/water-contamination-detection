import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../context/AuthContext'
import { AuthCard, Field, ErrorMessage, SubmitButton } from '../components/AuthForm'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard title="Welcome back" subtitle="Log in to Water Contamination Detection">
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorMessage>{error}</ErrorMessage>
        <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        <SubmitButton loading={loading}>Log in</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        Don't have an account?{' '}
        <Link to="/register" className="font-semibold text-sky-700 hover:underline">Register</Link>
      </p>
    </AuthCard>
  )
}
