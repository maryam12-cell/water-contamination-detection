import { test } from 'node:test'
import assert from 'node:assert/strict'
import { reportId } from './reportId.js'
import { buildReportPdf } from './reportPdf.js'

test('report IDs use the analysis year and a zero-padded number', () => {
  assert.equal(reportId(37, '2026-10-06 06:50:08'), 'WCD-2026-000037')
  assert.equal(reportId(1234567, '2027-01-01 00:00:00'), 'WCD-2027-1234567')
})

const baseReport = {
  reportId: 'WCD-2026-000001',
  analysis: { isContaminated: false, confidence: 0.8, modelVersion: 'sensor-thresholds-v1', notes: null, createdAt: '2026-10-06 06:50:08' },
  sample: { sourceType: 'river', location: 'Lahore', ph: 7.2, turbidity: 3, tds: 250, temperature: 24, imageFile: null, createdAt: '2026-10-06 06:50:08' },
  user: { name: 'Test User', email: 'test@example.com' },
  checks: [
    { parameter: 'ph', label: 'pH', value: 7.2, unit: '', limit: '6–9', exceeded: false },
    { parameter: 'turbidity', label: 'Turbidity', value: 3, unit: 'NTU', limit: '≤ 10 NTU', exceeded: false },
    { parameter: 'tds', label: 'TDS', value: 250, unit: 'mg/L', limit: '≤ 500 mg/L', exceeded: false },
  ],
  crops: [{ cropName: 'Wheat', minPh: 6, maxPh: 7.5, isSuitable: true, score: 70, reason: "pH 7.2 is within Wheat's range (6.0–7.5)" }],
}

test('builds a one-page PDF even without an image', async () => {
  const pdf = await buildReportPdf(baseReport)
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-')
  assert.match(pdf.toString('latin1'), /\/Count 1\b/)
})

test('handles contaminated samples and Urdu text without crashing', async () => {
  const pdf = await buildReportPdf({
    ...baseReport,
    analysis: { ...baseReport.analysis, isContaminated: true },
    sample: { ...baseReport.sample, location: 'نالہ لئی، راولپنڈی', imageFile: 'does/not/exist.jpg' },
    user: { name: 'عائشہ', email: 'a@example.com' },
    crops: [],
  })
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-')
})
