import { Router } from 'express'
import path from 'node:path'
import db, { WATER_BODY_TYPES } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { uploadImage, removeUploadedFile, SERVER_ROOT } from '../middleware/upload.js'
import { analyzeSample } from '../analysis/index.js'
import { saveCropRecommendations } from '../recommendation/index.js'

const router = Router()

router.use(requireAuth)

// Counts for the dashboard cards. A sample's status comes from its most recent analysis.
// Admins see totals across all users; normal users see only their own samples.
const summaryQuery = db.prepare(`
  WITH latest AS (
    SELECT a.sample_id, a.is_contaminated
    FROM analysis_results a
    WHERE a.id = (SELECT MAX(id) FROM analysis_results WHERE sample_id = a.sample_id)
  )
  SELECT
    COUNT(*)                                          AS total,
    COALESCE(SUM(l.is_contaminated = 1), 0)           AS contaminated,
    COALESCE(SUM(l.is_contaminated = 0), 0)           AS safe,
    COALESCE(SUM(l.sample_id IS NULL), 0)             AS pending
  FROM samples s
  LEFT JOIN latest l ON l.sample_id = s.id
  WHERE @userId IS NULL OR s.user_id = @userId
`)

router.get('/summary', (req, res) => {
  const userId = req.user.role === 'admin' ? null : req.user.id
  res.json(summaryQuery.get({ userId }))
})

// Allowed ranges for the numbers a user can type (sanity checks, not safety limits)
const READING_RANGES = {
  ph: { label: 'pH', min: 0, max: 14 },
  turbidity: { label: 'Turbidity', min: 0, max: 4000 },
  tds: { label: 'TDS', min: 0, max: 50000 },
  temperature: { label: 'Temperature', min: -5, max: 60 },
}

function parseSampleForm(body) {
  const readings = {}
  for (const [key, { label, min, max }] of Object.entries(READING_RANGES)) {
    const raw = body[key]?.trim()
    const value = Number(raw)
    if (!raw || !Number.isFinite(value)) return { error: `${label} is required and must be a number` }
    if (value < min || value > max) return { error: `${label} must be between ${min} and ${max}` }
    readings[key] = value
  }

  const sourceType = body.sourceType?.trim().toLowerCase()
  if (!WATER_BODY_TYPES.includes(sourceType)) {
    return { error: `Water body type must be one of: ${WATER_BODY_TYPES.join(', ')}` }
  }

  const location = body.location?.trim().slice(0, 200) || null
  return { readings, sourceType, location }
}

const insertSample = db.prepare(`
  INSERT INTO samples (user_id, location, source_type, ph, turbidity, tds, temperature, image_path)
  VALUES (@userId, @location, @sourceType, @ph, @turbidity, @tds, @temperature, @imagePath)
`)
const insertAnalysis = db.prepare(`
  INSERT INTO analysis_results (sample_id, is_contaminated, confidence, model_version, notes)
  VALUES (?, ?, ?, ?, ?)
`)

router.post('/', uploadImage('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please upload an image of the water source' })
  }

  const form = parseSampleForm(req.body)
  if (form.error) {
    removeUploadedFile(req.file)
    return res.status(400).json({ error: form.error })
  }

  // Stored relative to server/ with forward slashes, e.g. "uploads/abc.jpg"
  const imagePath = path.relative(SERVER_ROOT, req.file.path).split(path.sep).join('/')

  try {
    const analysis = await analyzeSample({ readings: form.readings, imagePath })

    const saved = db.transaction(() => {
      const sampleId = insertSample.run({
        userId: req.user.id,
        location: form.location,
        sourceType: form.sourceType,
        ...form.readings,
        imagePath,
      }).lastInsertRowid
      const analysisId = insertAnalysis.run(
        sampleId,
        analysis.isContaminated ? 1 : 0,
        analysis.confidence,
        analysis.modelVersion,
        analysis.reasons.join('; ') || null,
      ).lastInsertRowid
      saveCropRecommendations(analysisId, { isContaminated: analysis.isContaminated, ph: form.readings.ph })
      return { sampleId, analysisId }
    })()

    res.status(201).json({
      sample: { id: saved.sampleId, sourceType: form.sourceType, location: form.location, ...form.readings },
      analysis: {
        id: saved.analysisId,
        status: analysis.isContaminated ? 'contaminated' : 'safe',
        isContaminated: analysis.isContaminated,
        confidence: analysis.confidence,
        modelVersion: analysis.modelVersion,
        checks: analysis.checks,
        reasons: analysis.reasons,
      },
    })
  } catch (err) {
    removeUploadedFile(req.file)
    throw err
  }
})

export default router
