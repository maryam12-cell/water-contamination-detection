import { Router } from 'express'
import db from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { getCropRecommendations } from '../recommendation/index.js'

const router = Router()

router.use(requireAuth)

const ANALYSIS_COLUMNS = `
  a.id AS analysis_id, a.is_contaminated, a.confidence, a.created_at AS analysed_at,
  s.id AS sample_id, s.user_id, s.source_type, s.location, s.ph, s.turbidity, s.tds, s.temperature
`

const latestAnalysisForUser = db.prepare(`
  SELECT ${ANALYSIS_COLUMNS}
  FROM analysis_results a JOIN samples s ON s.id = a.sample_id
  WHERE s.user_id = ?
  ORDER BY a.id DESC
  LIMIT 1
`)

const analysisById = db.prepare(`
  SELECT ${ANALYSIS_COLUMNS}
  FROM analysis_results a JOIN samples s ON s.id = a.sample_id
  WHERE a.id = ?
`)

function buildResponse(row) {
  const isContaminated = row.is_contaminated === 1
  return {
    analysis: {
      id: row.analysis_id,
      status: isContaminated ? 'contaminated' : 'safe',
      isContaminated,
      confidence: row.confidence,
      analysedAt: row.analysed_at,
    },
    sample: {
      id: row.sample_id,
      sourceType: row.source_type,
      location: row.location,
      ph: row.ph,
      turbidity: row.turbidity,
      tds: row.tds,
      temperature: row.temperature,
    },
    recommendations: getCropRecommendations(row.analysis_id, { isContaminated, ph: row.ph }),
  }
}

// The current user's most recent analysis
router.get('/latest', (req, res) => {
  const row = latestAnalysisForUser.get(req.user.id)
  if (!row) return res.json({ analysis: null, sample: null, recommendations: [] })
  res.json(buildResponse(row))
})

// A specific analysis (owner or admin only)
router.get('/:analysisId', (req, res) => {
  const id = Number(req.params.analysisId)
  const row = Number.isInteger(id) ? analysisById.get(id) : undefined
  // Same 404 for "doesn't exist" and "not yours", so ids of other users' samples aren't revealed
  if (!row || (row.user_id !== req.user.id && req.user.role !== 'admin')) {
    return res.status(404).json({ error: 'Analysis not found' })
  }
  res.json(buildResponse(row))
})

export default router
