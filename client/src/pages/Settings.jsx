import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/PageHeader'
import RoleBadge from '../components/RoleBadge'

export default function Settings() {
  const { user } = useAuth()

  const rows = [
    ['Name', user.name],
    ['Email', user.email],
    ['Role', <RoleBadge key="role" role={user.role} />],
    ['Member since', user.created_at.slice(0, 10)],
  ]

  return (
    <>
      <PageHeader title="Settings" description="Your account information" />
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <dl className="divide-y divide-slate-100">
          {rows.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:gap-4">
              <dt className="w-40 shrink-0 text-sm font-medium text-slate-500">{label}</dt>
              <dd className="break-all text-slate-800">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  )
}
