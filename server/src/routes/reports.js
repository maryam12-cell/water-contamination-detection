import { Router } from 'express'
import path from 'node:path'
import db from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { SERVER_ROOT } from '../middleware/upload.js'
import { analyzeSensorReadings } from '../analysis/sensorAnalysis.js'
import { getCropRecommendations } from '../recommendation/index.js'
import { reportId } from '../reports/reportId.js'
import { buildReportPdf } from '../reports/reportPdf.js'

const router = Router()

router.use(requireAuth)

// Admins see every user's reports; users see only their own
const listReports = db.prepare(`
  SELECT a.id AS analysis_id, a.is_contaminated, a.confidence, a.created_at,
         s.id AS sample_id, s.source_type, s.location, s.ph, s.tds, s.turbidity, s.temperature,
         u.name AS user_name
  FROM analysis_results a
  JOIN samples s ON s.id = a.sample_id
  JOIN users u ON u.id = s.user_id
  WHERE @userId IS NULL OR s.user_id = @userId
  ORDER BY a.id DESC
`)

const reportById = db.prepare(`
  SELECT a.id AS analysis_id, a.is_contaminated, a.confidence, a.model_version, a.notes, a.created_at,
         s.id AS sample_id, s.user_id, s.source_type, s.location, s.ph, s.tds, s.turbidity, s.temperature,
         s.image_path, s.created_at AS sample_created_at,
         u.name AS user_name, u.email AS user_email
  FROM analysis_results a
  JOIN samples s ON s.id = a.sample_id
  JOIN users u ON u.id = s.user_id
  WHERE a.id = ?
`)

router.get('/', (req, res) => {
  const userId = req.user.role === 'admin' ? null : req.user.id
  const reports = listReports.all({ userId }).map((r) => ({
    id: r.analysis_id,
    reportId: reportId(r.analysis_id, r.created_at),
    createdAt: r.created_at,
    status: r.is_contaminated ? 'contaminated' : 'safe',
    confidence: r.confidence,
    sampleId: r.sample_id,
    sourceType: r.source_type,
    location: r.location,
    ph: r.ph,
    tds: r.tds,
    turbidity: r.turbidity,
    temperature: r.temperature,
    userName: r.user_name,
  }))
  res.json({ reports })
})

router.get('/:analysisId/pdf', async (req, res) => {
  const id = Number(req.params.analysisId)
  const row = Number.isInteger(id) ? reportById.get(id) : undefined
  // Same 404 for "doesn't exist" and "not yours"
  if (!row || (row.user_id !== req.user.id && req.user.role !== 'admin')) {
    return res.status(404).json({ error: 'Report not found' })
  }

  const isContaminated = row.is_contaminated === 1
  const rid = reportId(row.analysis_id, row.created_at)
  const pdf = await buildReportPdf({
    reportId: rid,
    analysis: {
      isContaminated,
      confidence: row.confidence,
      modelVersion: row.model_version,
      notes: row.notes,
      createdAt: row.created_at,
    },
    sample: {
      sourceType: row.source_type,
      location: row.location,
      ph: row.ph,
      turbidity: row.turbidity,
      tds: row.tds,
      temperature: row.temperature,
      imageFile: row.image_path ? path.join(SERVER_ROOT, row.image_path) : null,
      createdAt: row.sample_created_at,
    },
    user: { name: row.user_name, email: row.user_email },
    checks: analyzeSensorReadings({ ph: row.ph, turbidity: row.turbidity, tds: row.tds }).checks,
    crops: getCropRecommendations(row.analysis_id, { isContaminated, ph: row.ph }),
  })

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${rid}.pdf"`)
  res.send(pdf)
})

export default router
