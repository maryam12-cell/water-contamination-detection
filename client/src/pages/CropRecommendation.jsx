import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { AlertTriangle, CheckCircle2, Sprout, Upload, XCircle } from 'lucide-react'
import { api } from '../api'
import { useLanguage } from '../i18n/LanguageContext'
import PageHeader from '../components/PageHeader'

// pH scale drawn under each crop card
const SCALE_MIN = 4
const SCALE_MAX = 10
const toPercent = (ph) => ((Math.min(SCALE_MAX, Math.max(SCALE_MIN, ph)) - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100

// Built here (not taken from the server's English `reason`) so it can be shown in either language
function cropReason(t, { cropName, minPh, maxPh }, ph) {
  const vars = { ph, crop: t(`crop.${cropName}`), range: `${minPh.toFixed(1)}–${maxPh.toFixed(1)}` }
  if (ph < minPh) return t('crops.reason.below', vars)
  if (ph > maxPh) return t('crops.reason.above', vars)
  return t('crops.reason.within', vars)
}

// Numbers read left-to-right in both languages, so the scale is always LTR
function PhScale({ minPh, maxPh, ph, suitable }) {
  return (
    <div className="font-latin mt-4" dir="ltr" aria-hidden="true">
      <div className="relative h-2 rounded-full bg-slate-100">
        <div
          className={`absolute inset-y-0 rounded-full ${suitable ? 'bg-green-300' : 'bg-slate-300'}`}
          style={{ left: `${toPercent(minPh)}%`, width: `${toPercent(maxPh) - toPercent(minPh)}%` }}
        />
        <div
          className="absolute -top-1 h-4 w-1 -translate-x-1/2 rounded-full bg-sky-700"
          style={{ left: `${toPercent(ph)}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-slate-400">
        <span>pH {SCALE_MIN}</span>
        <span>{SCALE_MAX}</span>
      </div>
    </div>
  )
}

function scoreTone(score) {
  if (score >= 75) return { labelKey: 'crops.score.excellent', bar: 'bg-green-500', text: 'text-green-700' }
  if (score >= 50) return { labelKey: 'crops.score.fair', bar: 'bg-amber-400', text: 'text-amber-700' }
  return { labelKey: 'crops.score.none', bar: 'bg-slate-300', text: 'text-slate-500' }
}

function ScoreMeter({ score }) {
  const { t } = useLanguage()
  const value = Math.round(score ?? 0)
  const tone = scoreTone(value)
  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium text-slate-600">{t('crops.score')}</span>
        <span className="flex items-baseline gap-2">
          <span className="font-latin" dir="ltr">
            <span className="font-bold text-slate-800">{value}</span>
            <span className="text-slate-400">/100</span>
          </span>
          <span className={`text-xs font-semibold ${tone.text}`}>{t(tone.labelKey)}</span>
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function CropCard({ crop, ph }) {
  const { t } = useLanguage()
  const { cropName, isSuitable, minPh, maxPh } = crop
  const hasRange = minPh !== undefined && maxPh !== undefined

  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm ${isSuitable ? 'border-green-200' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`rounded-xl p-2.5 ${isSuitable ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
            <Sprout className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">{t(`crop.${cropName}`)}</h3>
            {hasRange && (
              <p className="text-xs text-slate-500">
                {t('crops.idealPh', { range: `${minPh.toFixed(1)}–${maxPh.toFixed(1)}` })}
              </p>
            )}
          </div>
        </div>
        <span
          className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
            isSuitable ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {isSuitable ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
          {isSuitable ? t('crops.suitable') : t('crops.unsuitable')}
        </span>
      </div>
      <p className="mt-3 text-sm text-slate-600">{hasRange ? cropReason(t, crop, ph) : crop.reason}</p>
      <ScoreMeter score={crop.score} />
      {hasRange && <PhScale minPh={minPh} maxPh={maxPh} ph={ph} suitable={isSuitable} />}
    </div>
  )
}

function SampleSummary({ sample, analysis }) {
  const { t, locale } = useLanguage()
  const contaminated = analysis.isContaminated
  const items = [
    [t('crops.waterBody'), sample.sourceType ? t(`water.${sample.sourceType}`) : t('common.none')],
    [t('upload.location'), sample.location || t('common.none')],
    [t('param.ph'), <span key="ph" className="font-latin">{sample.ph}</span>],
    // SQLite stores UTC without a zone marker, so add 'Z' before converting to local time
    [t('crops.analysed'), new Date(analysis.analysedAt + 'Z').toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })],
  ]

  return (
    <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-800">{t('crops.sample', { id: sample.id })}</h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            contaminated ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}
        >
          {t('crops.confidenceBadge', {
            status: contaminated ? t('result.contaminated') : t('result.safe'),
            percent: Math.round(analysis.confidence * 100),
          })}
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {items.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs font-medium text-slate-500">{label}</dt>
            <dd className="mt-0.5 break-words text-sm font-medium text-slate-800">
              {/* bdi keeps an English value (e.g. a location) from jumping to the other side in Urdu */}
              <bdi>{value}</bdi>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function UploadButton({ children }) {
  return (
    <Link
      to="/upload"
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-700 px-4 py-2.5 font-semibold text-white hover:bg-sky-800"
    >
      <Upload className="h-4 w-4" /> {children}
    </Link>
  )
}

export default function CropRecommendation() {
  const { t, tError } = useLanguage()
  const [searchParams] = useSearchParams()
  const analysisId = searchParams.get('analysis')
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api(analysisId ? `/crops/${analysisId}` : '/crops/latest')
      .then(setData)
      .catch(setError)
  }, [analysisId])

  const header = (
    <PageHeader title={t('crops.title')} description={analysisId ? t('crops.descSelected') : t('crops.descLatest')} />
  )

  if (error) {
    return (
      <>
        {header}
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{tError(error)}</p>
      </>
    )
  }

  if (!data) {
    return (
      <>
        {header}
        <div className="h-32 animate-pulse rounded-2xl bg-white shadow-sm" />
      </>
    )
  }

  if (!data.analysis) {
    return (
      <>
        {header}
        <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <Sprout className="h-10 w-10 text-slate-400" />
          <p className="mt-3 font-medium text-slate-700">{t('crops.noSamples')}</p>
          <p className="mt-1 mb-5 text-sm text-slate-500">{t('crops.noSamplesDesc')}</p>
          <UploadButton>{t('crops.uploadSample')}</UploadButton>
        </div>
      </>
    )
  }

  const { analysis, sample, recommendations } = data
  const suitableCount = recommendations.filter((c) => c.isSuitable).length

  return (
    <>
      {header}
      <SampleSummary sample={sample} analysis={analysis} />

      {analysis.isContaminated ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center sm:p-8">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-600" />
          <h2 className="mt-3 text-xl font-bold text-red-800">{t('crops.notSafeTitle')}</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-red-700">{t('crops.notSafeDesc')}</p>
          <div className="mt-6">
            <UploadButton>{t('crops.testAnother')}</UploadButton>
          </div>
        </section>
      ) : (
        <>
          <p className="mb-4 text-sm text-slate-600">
            <span className="font-semibold text-slate-800">
              {t('crops.countOf', { count: suitableCount, total: recommendations.length })}
            </span>{' '}
            {t('crops.suitableRest', { ph: sample.ph })}
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {recommendations.map((crop) => (
              <CropCard key={crop.cropName} crop={crop} ph={sample.ph} />
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-500">{t('crops.footnote')}</p>
        </>
      )}
    </>
  )
}
