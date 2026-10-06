import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ChevronLeft, ChevronRight, Database, Users } from 'lucide-react'
import { api } from '../api'
import { useLanguage } from '../i18n/LanguageContext'
import PageHeader from '../components/PageHeader'
import RoleBadge from '../components/RoleBadge'
import { DownloadButton, Num, StatusBadge } from '../components/ReportBits'
import { formatDate, usePdfDownload } from '../utils/reports'

const PAGE_SIZES = ['10', '25', '50']
const FILTER_KEYS = ['status', 'userId', 'from', 'to']

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200'

// Admin page with two tabs: all analysis records (filtered + paginated) and all users.
// Filters, page and tab live in the URL so Back/Refresh keep them.
export default function AdminRecords() {
  const { t } = useLanguage()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'users' ? 'users' : 'records'
  const [users, setUsers] = useState(null)
  const [usersError, setUsersError] = useState(null)

  useEffect(() => {
    api('/admin/users')
      .then((data) => setUsers(data.users))
      .catch(setUsersError)
  }, [])

  // Changing a filter goes back to page 1 unless the page itself is being changed
  function updateParams(changes) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    if (!('page' in changes)) next.delete('page')
    setParams(next, { replace: !('tab' in changes) })
  }

  const tabs = [
    { id: 'records', label: t('records.tab.records'), icon: Database },
    { id: 'users', label: t('records.tab.users'), icon: Users },
  ]

  return (
    <>
      <PageHeader title={t('nav.records')} description={t('records.desc')} />

      <div role="tablist" className="mb-6 flex gap-1 border-b border-slate-200">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => updateParams({ tab: id === 'users' ? 'users' : null })}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === id ? 'border-sky-600 text-sky-800' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'records' ? (
        <RecordsTab params={params} updateParams={updateParams} users={users} />
      ) : (
        <UsersTab users={users} error={usersError} onViewRecords={(userId) => updateParams({ tab: null, userId: String(userId) })} />
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Records tab
// ---------------------------------------------------------------------------

function RecordsTab({ params, updateParams, users }) {
  const { t, tError, locale } = useLanguage()
  const { downloading, downloadError, download } = usePdfDownload()

  const filters = Object.fromEntries(FILTER_KEYS.map((key) => [key, params.get(key) ?? '']))
  const page = params.get('page') ?? '1'
  const pageSize = PAGE_SIZES.includes(params.get('pageSize')) ? params.get('pageSize') : '10'
  const hasFilters = FILTER_KEYS.some((key) => filters[key])
  const dateOrderWrong = Boolean(filters.from && filters.to && filters.from > filters.to)

  const query = new URLSearchParams(
    Object.entries({ ...filters, page, pageSize }).filter(([, value]) => value),
  ).toString()

  // The result remembers which query it belongs to, so "loading" is simply "result is for another query"
  const [result, setResult] = useState(null)
  useEffect(() => {
    if (dateOrderWrong) return
    let cancelled = false
    api(`/admin/records?${query}`)
      .then((data) => !cancelled && setResult({ query, data, error: null }))
      .catch((error) => !cancelled && setResult({ query, data: null, error }))
    return () => {
      cancelled = true
    }
  }, [query, dateOrderWrong])

  const loading = !dateOrderWrong && result?.query !== query
  const data = result?.data
  const error = dateOrderWrong ? { key: 'error.dateOrder' } : result?.query === query ? result.error : null

  return (
    <>
      {/* Filters */}
      <section className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">{t('records.filter.from')}</span>
            <input
              type="date"
              dir="ltr"
              value={filters.from}
              max={filters.to || undefined}
              onChange={(e) => updateParams({ from: e.target.value })}
              className={`font-latin ${inputClass}`}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">{t('records.filter.to')}</span>
            <input
              type="date"
              dir="ltr"
              value={filters.to}
              min={filters.from || undefined}
              onChange={(e) => updateParams({ to: e.target.value })}
              className={`font-latin ${inputClass}`}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">{t('records.filter.status')}</span>
            <select value={filters.status} onChange={(e) => updateParams({ status: e.target.value })} className={inputClass}>
              <option value="">{t('records.filter.allStatuses')}</option>
              <option value="safe">{t('result.safe')}</option>
              <option value="contaminated">{t('result.contaminated')}</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">{t('records.filter.user')}</span>
            <select value={filters.userId} onChange={(e) => updateParams({ userId: e.target.value })} className={inputClass}>
              <option value="">{t('records.filter.allUsers')}</option>
              {users?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </label>
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={() => updateParams(Object.fromEntries(FILTER_KEYS.map((key) => [key, null])))}
            className="mt-3 text-sm font-semibold text-sky-700 hover:underline"
          >
            {t('records.clear')}
          </button>
        )}
      </section>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error instanceof Error ? tError(error) : t(error.key)}
        </p>
      )}
      {downloadError && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{tError(downloadError)}</p>}

      {!data && loading && <div className="h-64 animate-pulse rounded-2xl bg-white shadow-sm" />}

      {data && !dateOrderWrong && (
        <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'} aria-busy={loading}>
          {data.records.length === 0 ? (
            <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm">
              <p className="font-medium text-slate-700">{t('records.noRecords')}</p>
            </div>
          ) : (
            <>
              <RecordsTable records={data.records} locale={locale} downloading={downloading} onDownload={download} />
              <RecordCards records={data.records} locale={locale} downloading={downloading} onDownload={download} />
            </>
          )}
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            pageSize={data.pageSize}
            onPage={(p) => updateParams({ page: p > 1 ? String(p) : null })}
            onPageSize={(size) => updateParams({ pageSize: size === '10' ? null : size })}
          />
        </div>
      )}
    </>
  )
}

function SensorValues({ record, className = '' }) {
  const { t } = useLanguage()
  const values = [
    ['ph', record.ph, ''],
    ['tds', record.tds, 'mg/L'],
    ['turbidity', record.turbidity, 'NTU'],
    ['temperature', record.temperature, '°C'],
  ]
  return (
    <dl className={`grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs ${className}`}>
      {values.map(([key, value, unit]) => (
        <div key={key} className="flex items-baseline justify-between gap-2 whitespace-nowrap">
          <dt className="text-slate-500">{t(`param.${key}`)}</dt>
          <dd className="font-latin font-medium text-slate-800" dir="ltr">
            {value}
            {unit && ` ${unit}`}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function RecordsTable({ records, locale, downloading, onDownload }) {
  const { t } = useLanguage()
  return (
    <div className="hidden overflow-x-auto rounded-2xl bg-white shadow-sm lg:block">
      <table className="w-full text-start text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
          <tr>
            <th className="px-3 py-3 text-start font-medium">{t('reports.col.reportId')}</th>
            <th className="px-3 py-3 text-start font-medium">{t('reports.col.user')}</th>
            <th className="px-3 py-3 text-start font-medium">{t('reports.col.date')}</th>
            <th className="px-3 py-3 text-start font-medium">{t('reports.col.waterBody')}</th>
            <th className="px-3 py-3 text-start font-medium">{t('records.col.sensors')}</th>
            <th className="px-3 py-3 text-start font-medium">{t('reports.col.status')}</th>
            <th className="px-3 py-3 text-start font-medium">{t('reports.col.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
              <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-700"><Num>{r.reportId}</Num></td>
              <td className="px-3 py-3">
                <span className="block font-medium text-slate-800">{r.user.name}</span>
                <span className="font-latin block whitespace-nowrap text-xs text-slate-500" dir="ltr">{r.user.email}</span>
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-slate-600">{formatDate(r.createdAt, locale)}</td>
              <td className="px-3 py-3">
                {r.sourceType ? t(`water.${r.sourceType}`) : t('common.none')}
                {r.location && <span className="block max-w-[10rem] truncate text-xs text-slate-500">{r.location}</span>}
              </td>
              <td className="px-3 py-3"><SensorValues record={r} /></td>
              <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
              <td className="px-3 py-3">
                <DownloadButton report={r} downloading={downloading} onDownload={onDownload} compact />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RecordCards({ records, locale, downloading, onDownload }) {
  const { t } = useLanguage()
  return (
    <ul className="space-y-3 lg:hidden">
      {records.map((r) => (
        <li key={r.id} className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-slate-800"><Num>{r.reportId}</Num></p>
              <p className="text-xs text-slate-500">{formatDate(r.createdAt, locale)}</p>
            </div>
            <StatusBadge status={r.status} />
          </div>
          <p className="mt-2 truncate text-sm text-slate-700">
            <span className="font-medium">{r.user.name}</span>
            {' · '}
            {r.sourceType ? t(`water.${r.sourceType}`) : t('common.none')}
            {r.location && <> · {r.location}</>}
          </p>
          <SensorValues record={r} className="mt-3 rounded-xl bg-slate-50 p-3" />
          <DownloadButton report={r} downloading={downloading} onDownload={onDownload} className="mt-3 w-full" />
        </li>
      ))}
    </ul>
  )
}

// Page numbers to show: first, last, and the current page with its neighbours ("…" for gaps)
function pageList(page, totalPages) {
  const pages = new Set([1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages))
  const sorted = [...pages].sort((a, b) => a - b)
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? ['…', p] : [p]))
}

function Pagination({ page, totalPages, total, pageSize, onPage, onPageSize }) {
  const { t } = useLanguage()
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const buttonClass =
    'inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <nav className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" aria-label={t('records.page', { page, pages: totalPages })}>
      <div className="flex items-center gap-3 text-sm text-slate-600">
        <span>{t('records.range', { from, to, total })}</span>
        <label className="flex items-center gap-2">
          <span className="text-slate-500">{t('records.perPage')}</span>
          <select
            value={String(pageSize)}
            onChange={(e) => onPageSize(e.target.value)}
            className="font-latin rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => onPage(page - 1)}
            disabled={page <= 1}
            aria-label={t('records.prev')}
            className={`${buttonClass} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
          >
            <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" />
          </button>
          {pageList(page, totalPages).map((p, i) =>
            p === '…' ? (
              <span key={`gap-${i}`} className="px-1 text-slate-400">…</span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPage(p)}
                aria-current={p === page ? 'page' : undefined}
                className={`font-latin ${buttonClass} ${
                  p === page ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {p}
              </button>
            ),
          )}
          <button
            type="button"
            onClick={() => onPage(page + 1)}
            disabled={page >= totalPages}
            aria-label={t('records.next')}
            className={`${buttonClass} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
          >
            <ChevronRight className="h-4 w-4 rtl:-scale-x-100" />
          </button>
        </div>
      )}
    </nav>
  )
}

// ---------------------------------------------------------------------------
// Users tab
// ---------------------------------------------------------------------------

function UsersTab({ users, error, onViewRecords }) {
  const { t, tError, locale } = useLanguage()
  const date = (value) => (value ? new Date(value + 'Z').toLocaleDateString(locale, { dateStyle: 'medium' }) : t('users.never'))

  if (error) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{tError(error)}</p>
  if (!users) return <div className="h-64 animate-pulse rounded-2xl bg-white shadow-sm" />

  const viewButton = (u, className = '') => (
    <button
      type="button"
      onClick={() => onViewRecords(u.id)}
      disabled={u.samples === 0}
      className={`whitespace-nowrap rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-800 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {t('users.viewRecords')}
    </button>
  )

  return (
    <>
      <p className="mb-3 text-sm text-slate-500">{t('users.count', { count: users.length })}</p>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-2xl bg-white shadow-sm md:block">
        <table className="w-full text-start text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-3 text-start font-medium">{t('dashboard.name')}</th>
              <th className="px-3 py-3 text-start font-medium">{t('dashboard.role')}</th>
              <th className="px-3 py-3 text-start font-medium">{t('dashboard.joined')}</th>
              <th className="px-3 py-3 text-start font-medium">{t('users.samples')}</th>
              <th className="px-3 py-3 text-start font-medium">{t('dashboard.contaminated')}</th>
              <th className="px-3 py-3 text-start font-medium">{t('dashboard.safe')}</th>
              <th className="px-3 py-3 text-start font-medium">{t('users.lastSample')}</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-3 py-3">
                  <span className="block font-medium text-slate-800">{u.name}</span>
                  <span className="font-latin block text-xs text-slate-500" dir="ltr">{u.email}</span>
                </td>
                <td className="px-3 py-3"><RoleBadge role={u.role} /></td>
                <td className="whitespace-nowrap px-3 py-3 text-slate-600">{date(u.created_at)}</td>
                <td className="px-3 py-3 font-semibold text-slate-800"><Num>{u.samples}</Num></td>
                <td className="px-3 py-3 text-red-700"><Num>{u.contaminated}</Num></td>
                <td className="px-3 py-3 text-green-700"><Num>{u.safe}</Num></td>
                <td className="whitespace-nowrap px-3 py-3 text-slate-600">{date(u.last_sample_at)}</td>
                <td className="px-3 py-3 text-end">{viewButton(u)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-3 md:hidden">
        {users.map((u) => (
          <li key={u.id} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-800">{u.name}</p>
                <p className="font-latin truncate text-xs text-slate-500" dir="ltr">{u.email}</p>
              </div>
              <RoleBadge role={u.role} />
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center">
              {[
                [t('users.samples'), u.samples, 'text-slate-800'],
                [t('dashboard.contaminated'), u.contaminated, 'text-red-700'],
                [t('dashboard.safe'), u.safe, 'text-green-700'],
              ].map(([label, value, color]) => (
                <div key={label}>
                  <dt className="text-[11px] text-slate-500">{label}</dt>
                  <dd className={`font-latin text-sm font-semibold ${color}`}>{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-xs text-slate-500">
              {t('dashboard.joined')}: {date(u.created_at)} · {t('users.lastSample')}: {date(u.last_sample_at)}
            </p>
            {viewButton(u, 'mt-3 w-full')}
          </li>
        ))}
      </ul>
    </>
  )
}
