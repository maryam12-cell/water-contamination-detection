import { Router } from 'express'
import db from '../db.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(requireAuth, requireRole('admin'))

router.get('/users', (req, res) => {
  const users = db
    .prepare('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC')
    .all()
  res.json({ users })
})

export default router
