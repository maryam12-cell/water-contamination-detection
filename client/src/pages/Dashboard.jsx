import { useEffect, useState } from 'react'
import { AlertTriangle, FlaskConical, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import PageHeader from '../components/PageHeader'
import RoleBadge from '../components/RoleBadge'

const percent = (part, total) => (total ? Math.round((part / total) * 100) : 0)

function SummaryCard({ title, value, note, icon: Icon, tone, loading }) {
  const tones = {
    sky: 'bg-sky-100 text-sky-700',
    red: 'bg-red-100 text-red-700',
    green: 'bg-green-100 text-green-700',
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          {loading ? (
            <div className="mt-2 h-9 w-16 animate-pulse rounded bg-slate-200" />
          ) : (
            <p className="mt-1 text-3xl font-bold text-slate-800">{value}</p>
          )}
        </div>
        <div className={`rounded-xl p-3 ${tones[tone]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{loading ? ' ' : note}</p>
    </div>
  )
}

function UsersTable() {
  const [users, setUsers] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    api('/admin/users')
      .then((data) => setUsers(data.users))
      .catch((err) => setError(err.message))
  }, [])

  return (
    <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-slate-800">All users</h2>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="py-2 pr-4 font-medium">Name</th>
              <th className="py-2 pr-4 font-medium">Email</th>
              <th className="py-2 pr-4 font-medium">Role</th>
              <th className="py-2 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-100 last:border-0">
                <td className="py-2.5 pr-4">{u.name}</td>
                <td className="py-2.5 pr-4">{u.email}</td>
                <td className="py-2.5 pr-4"><RoleBadge role={u.role} /></td>
                <td className="py-2.5 whitespace-nowrap">{u.created_at.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')
  const isAdmin = user.role === 'admin'

  useEffect(() => {
    api('/samples/summary')
      .then(setSummary)
      .catch((err) => setError(err.message))
  }, [])

  const loading = !summary && !error
  const { total = 0, contaminated = 0, safe = 0, pending = 0 } = summary ?? {}

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.name}!`}
        description={
          isAdmin
            ? 'Overview of all water samples in the system.'
            : 'Upload a water sample to check contamination and get crop recommendations.'
        }
      />

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          title="Total Samples"
          value={total}
          note={pending ? `${pending} awaiting analysis` : 'All samples analysed'}
          icon={FlaskConical}
          tone="sky"
          loading={loading}
        />
        <SummaryCard
          title="Contaminated"
          value={contaminated}
          note={`${percent(contaminated, total)}% of all samples`}
          icon={AlertTriangle}
          tone="red"
          loading={loading}
        />
        <SummaryCard
          title="Safe"
          value={safe}
          note={`${percent(safe, total)}% of all samples`}
          icon={ShieldCheck}
          tone="green"
          loading={loading}
        />
      </div>

      {isAdmin && <UsersTable />}
    </>
  )
}
