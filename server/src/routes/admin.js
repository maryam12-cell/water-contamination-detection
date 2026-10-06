import { Router } from 'express'
import db from '../db.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { reportId } from '../reports/reportId.js'

const router = Router()

// Every route below is admin-only: non-admins get 403, logged-out visitors 401
router.use(requireAuth, requireRole('admin'))

// A sample's status comes from its most recent analysis
const LATEST_ANALYSIS = `
  latest AS (
    SELECT a.sample_id, a.is_contaminated
    FROM analysis_results a
    WHERE a.id = (SELECT MAX(id) FROM analysis_results WHERE sample_id = a.sample_id)
  )
`

const usersQuery = db.prepare(`
  WITH ${LATEST_ANALYSIS}
  SELECT u.id, u.name, u.email, u.role, u.created_at,
         COUNT(s.id)                              AS samples,
         COALESCE(SUM(l.is_contaminated = 1), 0)  AS contaminated,
         COALESCE(SUM(l.is_contaminated = 0), 0)  AS safe,
         MAX(s.created_at)                        AS last_sample_at
  FROM users u
  LEFT JOIN samples s ON s.user_id = u.id
  LEFT JOIN latest l ON l.sample_id = s.id
  GROUP BY u.id
  ORDER BY u.created_at DESC
`)

router.get('/users', (req, res) => {
  res.json({ users: usersQuery.all() })
})

// ---- Analysis records: filters + pagination ----

// A NULL parameter means "no filter". Dates are compared in the server's local time zone,
// which is what the admin sees in the browser when both run on the same machine.
const RECORDS_WHERE = `
  WHERE (@statusFlag IS NULL OR a.is_contaminated = @statusFlag)
    AND (@userId IS NULL OR s.user_id = @userId)
    AND (@from IS NULL OR date(a.created_at, 'localtime') >= @from)
    AND (@to IS NULL OR date(a.created_at, 'localtime') <= @to)
`

const countRecords = db.prepare(`
  SELECT COUNT(*) AS total
  FROM analysis_results a JOIN samples s ON s.id = a.sample_id
  ${RECORDS_WHERE}
`)

const pageOfRecords = db.prepare(`
  SELECT a.id, a.is_contaminated, a.confidence, a.created_at,
         s.source_type, s.location, s.ph, s.tds, s.turbidity, s.temperature,
         u.id AS user_id, u.name AS user_name, u.email AS user_email
  FROM analysis_results a
  JOIN samples s ON s.id = a.sample_id
  JOIN users u ON u.id = s.user_id
  ${RECORDS_WHERE}
  ORDER BY a.created_at DESC, a.id DESC
  LIMIT @limit OFFSET @offset
`)

const PAGE_SIZES = [10, 25, 50]
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// Returns { filters } or { error } from the query string
function parseRecordsQuery(query) {
  const page = query.page === undefined ? 1 : Number(query.page)
  if (!Number.isInteger(page) || page < 1) return { error: 'page must be a positive whole number' }

  const pageSize = query.pageSize === undefined ? 10 : Number(query.pageSize)
  if (!PAGE_SIZES.includes(pageSize)) return { error: `pageSize must be one of ${PAGE_SIZES.join(', ')}` }

  const status = query.status || null
  if (status && !['safe', 'contaminated'].includes(status)) return { error: 'status must be safe or contaminated' }

  const userId = query.userId ? Number(query.userId) : null
  if (userId !== null && (!Number.isInteger(userId) || userId < 1)) return { error: 'userId must be a valid user id' }

  const from = query.from || null
  const to = query.to || null
  for (const date of [from, to]) {
    if (date && (!DATE_RE.test(date) || Number.isNaN(Date.parse(date)))) return { error: 'Dates must be in YYYY-MM-DD format' }
  }
  if (from && to && from > to) return { error: 'The start date must be before the end date' }

  return {
    page,
    pageSize,
    params: { statusFlag: status === null ? null : status === 'contaminated' ? 1 : 0, userId, from, to },
  }
}

router.get('/records', (req, res) => {
  const parsed = parseRecordsQuery(req.query)
  if (parsed.error) return res.status(400).json({ error: parsed.error })

  const { pageSize, params } = parsed
  const { total } = countRecords.get(params)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(parsed.page, totalPages) // asking past the last page shows the last page

  const records = pageOfRecords.all({ ...params, limit: pageSize, offset: (page - 1) * pageSize }).map((r) => ({
    id: r.id,
    reportId: reportId(r.id, r.created_at),
    createdAt: r.created_at,
    status: r.is_contaminated ? 'contaminated' : 'safe',
    confidence: r.confidence,
    sourceType: r.source_type,
    location: r.location,
    ph: r.ph,
    tds: r.tds,
    turbidity: r.turbidity,
    temperature: r.temperature,
    user: { id: r.user_id, name: r.user_name, email: r.user_email },
  }))

  res.json({ records, page, pageSize, total, totalPages })
})

export default router
