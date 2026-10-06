import { useEffect, useState } from 'react'
import { AlertTriangle, FlaskConical, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../i18n/LanguageContext'
import { api } from '../api'
import PageHeader from '../components/PageHeader'

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
            <p className="font-latin mt-1 text-3xl font-bold text-slate-800">{value}</p>
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

export default function Dashboard() {
  const { user } = useAuth()
  const { t, tError } = useLanguage()
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState(null)
  const isAdmin = user.role === 'admin'

  useEffect(() => {
    api('/samples/summary')
      .then(setSummary)
      .catch(setError)
  }, [])

  const loading = !summary && !error
  const { total = 0, contaminated = 0, safe = 0, pending = 0 } = summary ?? {}

  return (
    <>
      <PageHeader
        title={t('dashboard.welcome', { name: user.name })}
        description={isAdmin ? t('dashboard.adminDesc') : t('dashboard.userDesc')}
      />

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{tError(error)}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          title={t('dashboard.totalSamples')}
          value={total}
          note={pending ? t('dashboard.awaiting', { count: pending }) : t('dashboard.allAnalysed')}
          icon={FlaskConical}
          tone="sky"
          loading={loading}
        />
        <SummaryCard
          title={t('dashboard.contaminated')}
          value={contaminated}
          note={t('dashboard.percentOfAll', { percent: percent(contaminated, total) })}
          icon={AlertTriangle}
          tone="red"
          loading={loading}
        />
        <SummaryCard
          title={t('dashboard.safe')}
          value={safe}
          note={t('dashboard.percentOfAll', { percent: percent(safe, total) })}
          icon={ShieldCheck}
          tone="green"
          loading={loading}
        />
      </div>
    </>
  )
}
