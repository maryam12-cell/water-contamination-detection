import { Languages } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'

const OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'ur', label: 'اردو' },
]

export default function LanguageToggle({ className = '' }) {
  const { lang, setLang, t } = useLanguage()

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Languages className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
      <div role="group" aria-label={t('lang.label')} className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            lang={option.value}
            aria-pressed={lang === option.value}
            onClick={() => setLang(option.value)}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              lang === option.value ? 'bg-white text-sky-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
