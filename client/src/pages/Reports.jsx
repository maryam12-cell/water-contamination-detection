import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { FileText, Search, Upload } from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../i18n/LanguageContext'
import PageHeader from '../components/PageHeader'
import { DownloadButton, Num, StatusBadge } from '../components/ReportBits'
import { formatDate, usePdfDownload } from '../utils/reports'

const FILTERS = ['all', 'safe', 'contaminated']

export default function Reports() {
  const { user } = useAuth()
  const { t, tError, locale } = useLanguage()
  const isAdmin = user.role === 'admin'
  const [reports, setReports] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const { downloading, downloadError, download: handleDownload } = usePdfDownload()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    api('/reports')
      .then((data) => setReports(data.reports))
      .catch(setLoadError)
  }, [])

  const visible = useMemo(() => {
    if (!reports) return []
    const query = search.trim().toLowerCase()
    return reports.filter((r) => {
      if (filter !== 'all' && r.status !== filter) return false
      if (!query) return true
      // Match English and translated words, so searching "دریا" or "river" both work
      const haystack = [
        r.reportId,
        r.location,
        r.sourceType,
        r.sourceType && t(`water.${r.sourceType}`),
        formatDate(r.createdAt, locale),
        r.createdAt,
        isAdmin && r.userName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [reports, search, filter, t, locale, isAdmin])

  const header = <PageHeader title={t('nav.reports')} description={t('reports.desc')} />

  if (loadError) {
    return (
      <>
        {header}
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{tError(loadError)}</p>
      </>
    )
  }

  if (!reports) {
    return (
      <>
        {header}
        <div className="h-48 animate-pulse rounded-2xl bg-white shadow-sm" />
      </>
    )
  }

  if (reports.length === 0) {
    return (
      <>
        {header}
        <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <FileText className="h-10 w-10 text-slate-400" />
          <p className="mt-3 font-medium text-slate-700">{t('reports.empty')}</p>
          <p className="mt-1 mb-5 text-sm text-slate-500">{t('reports.emptyDesc')}</p>
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 rounded-lg bg-sky-700 px-4 py-2.5 font-semibold text-white hover:bg-sky-800"
          >
            <Upload className="h-4 w-4" /> {t('crops.uploadSample')}
          </Link>
        </div>
      </>
    )
  }

  const waterBody = (r) => (r.sourceType ? t(`water.${r.sourceType}`) : t('common.none'))

  return (
    <>
      {header}

      {/* Search and filter */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="relative block md:w-96">
          <span className="sr-only">{t('reports.searchPlaceholder')}</span>
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            dir="auto"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('reports.searchPlaceholder')}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 ps-9 pe-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
          />
        </label>
        <div role="group" className="inline-flex self-start rounded-lg border border-slate-200 bg-white p-0.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f ? 'bg-sky-100 text-sky-800' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t(`reports.filter.${f}`)}
            </button>
          ))}
        </div>
      </div>

      <p className="mb-3 text-sm text-slate-500">{t('reports.showing', { shown: visible.length, total: reports.length })}</p>
      {downloadError && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{tError(downloadError)}</p>
      )}

      {visible.length === 0 ? (
        <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm">
          <p className="font-medium text-slate-700">{t('reports.noMatch')}</p>
          <button
            type="button"
            onClick={() => {
              setSearch('')
              setFilter('all')
            }}
            className="mt-3 text-sm font-semibold text-sky-700 hover:underline"
          >
            {t('reports.clearFilters')}
          </button>
        </div>
      ) : (
        <>
          {/* Desktop / tablet: table */}
          <div className="hidden overflow-x-auto rounded-2xl bg-white shadow-sm md:block">
            <table className="w-full text-start text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-3 text-start font-medium">{t('reports.col.reportId')}</th>
                  <th className="px-3 py-3 text-start font-medium">{t('reports.col.date')}</th>
                  {isAdmin && <th className="px-3 py-3 text-start font-medium">{t('reports.col.user')}</th>}
                  <th className="px-3 py-3 text-start font-medium">{t('reports.col.waterBody')}</th>
                  <th className="px-3 py-3 text-start font-medium">{t('param.ph')}</th>
                  <th className="px-3 py-3 text-start font-medium">{t('param.tds')}</th>
                  <th className="px-3 py-3 text-start font-medium">{t('param.turbidity')}</th>
                  <th className="px-3 py-3 text-start font-medium">{t('param.temperature')}</th>
                  <th className="px-3 py-3 text-start font-medium">{t('reports.col.status')}</th>
                  <th className="px-3 py-3 text-start font-medium">{t('reports.col.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-700"><Num>{r.reportId}</Num></td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-600">{formatDate(r.createdAt, locale)}</td>
                    {isAdmin && <td className="px-3 py-3 text-slate-600">{r.userName}</td>}
                    <td className="px-3 py-3">
                      {waterBody(r)}
                      {r.location && <span className="block max-w-[12rem] truncate text-xs text-slate-500">{r.location}</span>}
                    </td>
                    <td className="px-3 py-3"><Num>{r.ph}</Num></td>
                    <td className="whitespace-nowrap px-3 py-3"><Num>{r.tds} mg/L</Num></td>
                    <td className="whitespace-nowrap px-3 py-3"><Num>{r.turbidity} NTU</Num></td>
                    <td className="whitespace-nowrap px-3 py-3"><Num>{r.temperature} °C</Num></td>
                    <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-3 py-3">
                      <DownloadButton report={r} downloading={downloading} onDownload={handleDownload} compact />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: one card per report */}
          <ul className="space-y-3 md:hidden">
            {visible.map((r) => (
              <li key={r.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800"><Num>{r.reportId}</Num></p>
                    <p className="text-xs text-slate-500">{formatDate(r.createdAt, locale)}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <p className="mt-2 truncate text-sm text-slate-600">
                  {waterBody(r)}
                  {r.location && <> · {r.location}</>}
                  {isAdmin && <> · {r.userName}</>}
                </p>
                <dl className="mt-3 grid grid-cols-4 gap-2 rounded-xl bg-slate-50 p-3 text-center">
                  {[
                    ['ph', r.ph, ''],
                    ['tds', r.tds, 'mg/L'],
                    ['turbidity', r.turbidity, 'NTU'],
                    ['temperature', r.temperature, '°C'],
                  ].map(([key, value, unit]) => (
                    <div key={key} className="min-w-0">
                      <dt className="truncate text-[11px] text-slate-500">{t(`param.${key}`)}</dt>
                      <dd className="text-sm font-semibold text-slate-800">
                        <Num>{value}</Num>
                        {unit && <span className="font-latin block text-[10px] font-normal text-slate-400">{unit}</span>}
                      </dd>
                    </div>
                  ))}
                </dl>
                <DownloadButton report={r} downloading={downloading} onDownload={handleDownload} className="mt-3 w-full" />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
