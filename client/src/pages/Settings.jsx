import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../i18n/LanguageContext'
import PageHeader from '../components/PageHeader'
import RoleBadge from '../components/RoleBadge'
import LanguageToggle from '../components/LanguageToggle'

export default function Settings() {
  const { user } = useAuth()
  const { t, locale } = useLanguage()

  const rows = [
    [t('dashboard.name'), user.name],
    [t('dashboard.email'), <span key="email" className="font-latin" dir="ltr">{user.email}</span>],
    [t('dashboard.role'), <RoleBadge key="role" role={user.role} />],
    [t('settings.memberSince'), new Date(user.created_at + 'Z').toLocaleDateString(locale, { dateStyle: 'medium' })],
    [t('lang.label'), <LanguageToggle key="lang" />],
  ]

  return (
    <>
      <PageHeader title={t('settings.title')} description={t('settings.desc')} />
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
