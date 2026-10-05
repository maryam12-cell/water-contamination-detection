import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { AlertTriangle, ImagePlus, RotateCcw, ShieldCheck, X } from 'lucide-react'
import { api } from '../api'
import PageHeader from '../components/PageHeader'

const MAX_IMAGE_MB = 10
const ALLOWED_TYPES = ['image/jpeg', 'image/png']
const WATER_BODIES = ['river', 'lake', 'pond', 'stream']

const READING_FIELDS = [
  { name: 'ph', label: 'pH', unit: '', hint: 'Safe range: 6.0 – 9.0', min: 0, max: 14, step: '0.1' },
  { name: 'turbidity', label: 'Turbidity', unit: 'NTU', hint: 'Safe limit: ≤ 10 NTU', min: 0, max: 4000, step: '0.1' },
  { name: 'tds', label: 'TDS', unit: 'mg/L', hint: 'Safe limit: ≤ 500 mg/L', min: 0, max: 50000, step: '1' },
  { name: 'temperature', label: 'Temperature', unit: '°C', hint: 'Recorded for reference', min: -5, max: 60, step: '0.1' },
]

const EMPTY_FORM = { ph: '', turbidity: '', tds: '', temperature: '', sourceType: '', location: '' }

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1)

function ImagePicker({ file, onChange, onError }) {
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
    if (!ALLOWED_TYPES.includes(selected.type)) return onError('Only JPG, JPEG or PNG images are allowed')
    if (selected.size > MAX_IMAGE_MB * 1024 * 1024) return onError(`Image must be ${MAX_IMAGE_MB} MB or smaller`)
    onError('')
    setPreview(selected)
    onChange(selected)
  }

  if (file) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        {previewUrl && <img src={previewUrl} alt="Selected water sample" className="h-56 w-full object-contain sm:h-64" />}
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-3 py-2 text-sm">
          <span className="truncate text-slate-700">{file.name}</span>
          <span className="shrink-0 text-slate-500">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
        </div>
        <button
          type="button"
          onClick={() => {
            setPreview(null)
            onChange(null)
            if (inputRef.current) inputRef.current.value = ''
          }}
          className="absolute right-2 top-2 flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1 text-sm font-medium text-slate-700 shadow hover:bg-white"
        >
          <X className="h-4 w-4" /> Remove
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
      <span className="mt-3 font-medium text-slate-700">Click to choose a photo, or drag it here</span>
      <span className="mt-1 text-sm text-slate-500">JPG, JPEG or PNG · max {MAX_IMAGE_MB} MB</span>
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
          <p className="text-sm font-medium text-slate-500">Analysis result</p>
          <p className={`text-2xl font-bold ${contaminated ? 'text-red-700' : 'text-green-700'}`}>
            {contaminated ? 'Contaminated' : 'Safe'}
          </p>
        </div>
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium text-slate-600">Confidence score</span>
            <span className="text-lg font-bold text-slate-800">{percent}%</span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${contaminated ? 'bg-red-500' : 'bg-green-500'}`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">Based on sensor thresholds (image model coming soon)</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="py-2 pr-3 font-medium">Parameter</th>
                <th className="py-2 pr-3 font-medium">Your value</th>
                <th className="hidden py-2 pr-3 font-medium sm:table-cell">Safe limit</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {analysis.checks.map((c) => (
                <tr key={c.parameter} className="border-b border-slate-100 last:border-0">
                  <td className="py-2.5 pr-3 font-medium text-slate-700">{c.label}</td>
                  <td className="py-2.5 pr-3">
                    {c.value}{c.unit && ` ${c.unit}`}
                    {/* On small screens the limit is shown here instead of in its own column */}
                    <span className="block text-xs text-slate-500 sm:hidden">Limit {c.limit}</span>
                  </td>
                  <td className="hidden py-2.5 pr-3 text-slate-500 sm:table-cell">{c.limit}</td>
                  <td className="py-2.5 whitespace-nowrap">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        c.exceeded ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {c.exceeded ? 'Out of range' : 'Normal'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={onReset}
            className="flex items-center justify-center gap-2 rounded-lg bg-sky-700 px-4 py-2.5 font-semibold text-white hover:bg-sky-800"
          >
            <RotateCcw className="h-4 w-4" /> Upload another sample
          </button>
          <Link
            to="/dashboard"
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-center font-semibold text-slate-700 hover:bg-slate-50"
          >
            View dashboard
          </Link>
        </div>
      </div>
    </section>
  )
}

export default function UploadSample() {
  const [image, setImage] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  async function handleSubmit(e) {
    e.preventDefault()
    if (!image) return setError('Please choose an image of the water source')
    if (!form.sourceType) return setError('Please select the water body type')

    const data = new FormData()
    data.append('image', image)
    for (const [key, value] of Object.entries(form)) data.append(key, value)

    setError('')
    setSubmitting(true)
    try {
      setResult(await api('/samples', { method: 'POST', body: data }))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setResult(null)
    setImage(null)
    setForm(EMPTY_FORM)
    setError('')
  }

  if (result) {
    return (
      <>
        <PageHeader title="Upload Sample" description="Your sample has been analysed and saved." />
        <ResultCard result={result} onReset={reset} />
      </>
    )
  }

  return (
    <>
      <PageHeader title="Upload Sample" description="Add a photo of the water source and its sensor readings." />

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-4 font-semibold text-slate-800">1. Water source photo</h2>
          <ImagePicker file={image} onChange={setImage} onError={setError} />
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-4 font-semibold text-slate-800">2. Sensor readings</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {READING_FIELDS.map(({ name, label, unit, hint, min, max, step }) => (
              <label key={name} className="block">
                <span className="text-sm font-medium text-slate-700">
                  {label} {unit && <span className="text-slate-400">({unit})</span>}
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  required
                  min={min}
                  max={max}
                  step={step}
                  value={form[name]}
                  onChange={update(name)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                />
                <span className="mt-1 block text-xs text-slate-500">{hint}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-4 font-semibold text-slate-800">3. Water body</h2>
          <fieldset>
            <legend className="text-sm font-medium text-slate-700">Type</legend>
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
                  {capitalize(type)}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="mt-4 block">
            <span className="text-sm font-medium text-slate-700">
              Location <span className="text-slate-400">(optional)</span>
            </span>
            <input
              type="text"
              maxLength={200}
              placeholder="e.g. Ravi River, Lahore"
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
          {submitting ? 'Analysing...' : 'Analyse sample'}
        </button>
      </form>
    </>
  )
}
