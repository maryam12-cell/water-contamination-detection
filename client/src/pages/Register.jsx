import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../context/AuthContext'
import { AuthCard, Field, ErrorMessage, SubmitButton } from '../components/AuthForm'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.password.length < 8) return setError('Password must be at least 8 characters')
    if (form.password !== form.confirm) return setError('Passwords do not match')

    setLoading(true)
    try {
      await register(form.name, form.email, form.password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard title="Create an account" subtitle="Start testing your water samples">
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorMessage>{error}</ErrorMessage>
        <Field label="Full name" value={form.name} onChange={update('name')} required autoComplete="name" />
        <Field label="Email" type="email" value={form.email} onChange={update('email')} required autoComplete="email" />
        <Field label="Password" type="password" value={form.password} onChange={update('password')} required minLength={8} autoComplete="new-password" />
        <Field label="Confirm password" type="password" value={form.confirm} onChange={update('confirm')} required autoComplete="new-password" />
        <SubmitButton loading={loading}>Register</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-sky-700 hover:underline">Log in</Link>
      </p>
    </AuthCard>
  )
}
