import { useLanguage } from '../i18n/LanguageContext'

export default function RoleBadge({ role }) {
  const { t } = useLanguage()
  const styles = role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'
  return <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles}`}>{t(`role.${role}`)}</span>
}
