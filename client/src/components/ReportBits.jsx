// Small pieces shared by the Reports and admin Records pages
import { Download, Loader2 } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'

export function StatusBadge({ status }) {
  const { t } = useLanguage()
  const contaminated = status === 'contaminated'
  return (
    <span
      className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        contaminated ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
      }`}
    >
      {contaminated ? t('result.contaminated') : t('result.safe')}
    </span>
  )
}

// `compact` shows just "PDF" (for the table); the full label stays available as a tooltip
export function DownloadButton({ report, downloading, onDownload, compact = false, className = '' }) {
  const { t } = useLanguage()
  const busy = downloading === report.id
  const label = busy ? t('reports.downloading') : t('reports.download')
  return (
    <button
      type="button"
      onClick={() => onDownload(report)}
      disabled={busy}
      title={label}
      aria-label={`${label} ${report.reportId}`}
      className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-800 hover:bg-sky-100 disabled:opacity-60 ${className}`}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {compact ? <span className="font-latin">PDF</span> : label}
    </button>
  )
}

export const Num = ({ children }) => <span className="font-latin" dir="ltr">{children}</span>
