import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { AlertTriangle, ImagePlus, RotateCcw, ShieldCheck, Sprout, X } from 'lucide-react'
import { api } from '../api'
import { useLanguage } from '../i18n/LanguageContext'
import PageHeader from '../components/PageHeader'

const MAX_IMAGE_MB = 10
const ALLOWED_TYPES = ['image/jpeg', 'image/png']
const WATER_BODIES = ['river', 'lake', 'pond', 'stream']

const READING_FIELDS = [
  { name: 'ph', unit: '', min: 0, max: 14, step: '0.1' },
  { name: 'turbidity', unit: 'NTU', min: 0, max: 4000, step: '0.1' },
  { name: 'tds', unit: 'mg/L', min: 0, max: 50000, step: '1' },
  { name: 'temperature', unit: '°C', min: -5, max: 60, step: '0.1' },
]

const EMPTY_FORM = { ph: '', turbidity: '', tds: '', temperature: '', sourceType: '', location: '' }

// Errors are kept untranslated ({ key, vars } or an Error from api()) so they follow a language switch.
// `vars.field` is a parameter key like 'ph' and is translated here.
function useErrorText() {
  const { t, tError } = useLanguage()
  return (error) => {
    if (error instanceof Error) return tError(error)
    const vars = error.vars?.field ? { ...error.vars, field: t(`param.${error.vars.field}`) } : error.vars
    return t(error.key, vars)
  }
}

// Same checks as the server, done here so messages appear in the chosen language
function validateReadings(form) {
  for (const { name, min, max } of READING_FIELDS) {
    const raw = form[name].trim()
    const value = Number(raw)
    if (!raw || !Number.isFinite(value)) return { key: 'error.fieldRequired', vars: { field: name } }
    if (value < min || value > max) return { key: 'error.fieldRange', vars: { field: name, min, max } }
  }
  return null
}

function ImagePicker({ file, onChange, onError }) {
  const { t } = useLanguage()
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)

  // Free the preview's memory when this component goes away
  const previewRef = useRef(null)
  useEffect(() => () => previewRef.current && URL.revokeObjectURL(previewRef.current), [])

  function setPreview(selected) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = selected ? URL.createObjectURL(selected) : null
    setPreviewUrl(previewRef.current)
  }

  function pick(selected) {
    if (!selected) return
    if (!ALLOWED_TYPES.includes(selected.type)) return onError({ key: 'upload.badType' })
    if (selected.size > MAX_IMAGE_MB * 1024 * 1024) return onError({ key: 'upload.tooBig', vars: { mb: MAX_IMAGE_MB } })
    onError(null)
    setPreview(selected)
    onChange(selected)
  }

  if (file) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        {previewUrl && <img src={previewUrl} alt={t('upload.previewAlt')} className="h-56 w-full object-contain sm:h-64" />}
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-3 py-2 text-sm">
          <span className="font-latin truncate text-slate-700" dir="ltr">{file.name}</span>
          <span className="font-latin shrink-0 text-slate-500" dir="ltr">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
        </div>
        <button
          type="button"
          onClick={() => {
            setPreview(null)
            onChange(null)
            if (inputRef.current) inputRef.current.value = ''
          }}
          className="absolute end-2 top-2 flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1 text-sm font-medium text-slate-700 shadow hover:bg-white"
        >
          <X className="h-4 w-4" /> {t('upload.remove')}
        </button>
      </div>
    )
  }

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        pick(e.dataTransfer.files[0])
      }}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors ${
        dragging ? 'border-sky-500 bg-sky-50' : 'border-slate-300 hover:border-sky-400 hover:bg-slate-50'
      }`}
    >
      <ImagePlus className="h-10 w-10 text-sky-600" />
      <span className="mt-3 font-medium text-slate-700">{t('upload.dropHere')}</span>
      <span className="mt-1 text-sm text-slate-500">{t('upload.fileHint', { mb: MAX_IMAGE_MB })}</span>
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
        className="sr-only"
        onChange={(e) => pick(e.target.files[0])}
      />
    </label>
  )
}

function ResultCard({ result, onReset }) {
  const { t } = useLanguage()
  const { analysis } = result
  const contaminated = analysis.isContaminated
  const percent = Math.round(analysis.confidence * 100)

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className={`flex items-center gap-4 p-5 sm:p-6 ${contaminated ? 'bg-red-50' : 'bg-green-50'}`}>
        <div className={`rounded-2xl p-3 ${contaminated ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {contaminated ? <AlertTriangle className="h-8 w-8" /> : <ShieldCheck className="h-8 w-8" />}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">{t('result.title')}</p>
          <p className={`text-2xl font-bold ${contaminated ? 'text-red-700' : 'text-green-700'}`}>
            {contaminated ? t('result.contaminated') : t('result.safe')}
          </p>
        </div>
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium text-slate-600">{t('result.confidence')}</span>
            <span className="font-latin text-lg font-bold text-slate-800">{percent}%</span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${contaminated ? 'bg-red-500' : 'bg-green-500'}`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">{t('result.basedOn')}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="py-2 pe-3 text-start font-medium">{t('result.parameter')}</th>
                <th className="py-2 pe-3 text-start font-medium">{t('result.yourValue')}</th>
                <th className="hidden py-2 pe-3 text-start font-medium sm:table-cell">{t('result.safeLimit')}</th>
                <th className="py-2 text-start font-medium">{t('result.status')}</th>
              </tr>
            </thead>
            <tbody>
              {analysis.checks.map((c) => (
                <tr key={c.parameter} className="border-b border-slate-100 last:border-0">
                  <td className="py-2.5 pe-3 font-medium text-slate-700">{t(`param.${c.parameter}`)}</td>
                  <td className="py-2.5 pe-3">
                    <span className="font-latin" dir="ltr">{c.value}{c.unit && ` ${c.unit}`}</span>
                    {/* On small screens the limit is shown here instead of in its own column */}
                    <span className="block text-xs text-slate-500 sm:hidden">
                      {t('result.limit', { limit: '' })}<bdi className="font-latin">{c.limit}</bdi>
                    </span>
                  </td>
                  <td className="hidden py-2.5 pe-3 text-slate-500 sm:table-cell">
                    <bdi className="font-latin">{c.limit}</bdi>
                  </td>
                  <td className="py-2.5 whitespace-nowrap">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        c.exceeded ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {c.exceeded ? t('result.outOfRange') : t('result.normal')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            to={`/crops?analysis=${analysis.id}`}
            className="flex items-center justify-center gap-2 rounded-lg bg-green-700 px-4 py-2.5 font-semibold text-white hover:bg-green-800"
          >
            <Sprout className="h-4 w-4" /> {t('result.viewCrops')}
          </Link>
          <button
            onClick={onReset}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4" /> {t('result.another')}
          </button>
          <Link
            to="/dashboard"
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-center font-semibold text-slate-700 hover:bg-slate-50"
          >
            {t('result.viewDashboard')}
          </Link>
        </div>
      </div>
    </section>
  )
}

export default function UploadSample() {
  const { t } = useLanguage()
  const errorText = useErrorText()
  const [image, setImage] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  async function handleSubmit(e) {
    e.preventDefault()
    if (!image) return setError({ key: 'upload.chooseImage' })
    const readingsError = validateReadings(form)
    if (readingsError) return setError(readingsError)
    if (!form.sourceType) return setError({ key: 'upload.chooseType' })

    const data = new FormData()
    data.append('image', image)
    for (const [key, value] of Object.entries(form)) data.append(key, value)

    setError(null)
    setSubmitting(true)
    try {
      setResult(await api('/samples', { method: 'POST', body: data }))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(err)
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setResult(null)
    setImage(null)
    setForm(EMPTY_FORM)
    setError(null)
  }

  if (result) {
    return (
      <>
        <PageHeader title={t('upload.title')} description={t('upload.doneDesc')} />
        <ResultCard result={result} onReset={reset} />
      </>
    )
  }

  return (
    <>
      <PageHeader title={t('upload.title')} description={t('upload.desc')} />

      {/* noValidate: the browser's own popups would appear in the browser's language, not the app's */}
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorText(error)}</p>}

        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-4 font-semibold text-slate-800">{t('upload.step1')}</h2>
          <ImagePicker file={image} onChange={setImage} onError={setError} />
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-4 font-semibold text-slate-800">{t('upload.step2')}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {READING_FIELDS.map(({ name, unit, min, max, step }) => (
              <label key={name} className="block">
                <span className="text-sm font-medium text-slate-700">
                  {t(`param.${name}`)} {unit && <span className="font-latin text-slate-400">({unit})</span>}
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  dir="ltr"
                  required
                  min={min}
                  max={max}
                  step={step}
                  value={form[name]}
                  onChange={update(name)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                />
                <span className="mt-1 block text-xs text-slate-500">{t(`upload.hint.${name}`)}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-4 font-semibold text-slate-800">{t('upload.step3')}</h2>
          <fieldset>
            <legend className="text-sm font-medium text-slate-700">{t('upload.type')}</legend>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {WATER_BODIES.map((type) => (
                <label
                  key={type}
                  className={`cursor-pointer rounded-lg border px-3 py-2.5 text-center text-sm font-medium transition-colors has-focus-visible:ring-2 has-focus-visible:ring-sky-300 ${
                    form.sourceType === type
                      ? 'border-sky-600 bg-sky-50 text-sky-800'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="sourceType"
                    value={type}
                    checked={form.sourceType === type}
                    onChange={update('sourceType')}
                    className="sr-only"
                  />
                  {t(`water.${type}`)}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="mt-4 block">
            <span className="text-sm font-medium text-slate-700">
              {t('upload.location')} <span className="text-slate-400">{t('common.optional')}</span>
            </span>
            <input
              type="text"
              dir="auto"
              maxLength={200}
              placeholder={t('upload.locationPlaceholder')}
              value={form.location}
              onChange={update('location')}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
            />
          </label>
        </section>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-sky-700 py-3 font-semibold text-white hover:bg-sky-800 disabled:opacity-60 sm:w-auto sm:px-8"
        >
          {submitting ? t('upload.submitting') : t('upload.submit')}
        </button>
      </form>
    </>
  )
}
