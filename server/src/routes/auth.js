import { Router } from 'express'
import bcrypt from 'bcryptjs'
import db from '../db.js'
import { COOKIE_NAME, signToken, setAuthCookie, requireAuth } from '../middleware/auth.js'

const router = Router()
const SALT_ROUNDS = 10
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const publicUser = ({ id, name, email, role, created_at }) => ({ id, name, email, role, created_at })

router.post('/register', async (req, res) => {
  const name = req.body.name?.trim()
  const email = req.body.email?.trim().toLowerCase()
  const password = req.body.password ?? ''

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' })
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email' })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
    return res.status(409).json({ error: 'An account with this email already exists' })
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
  // New accounts are always 'user'. Admins are created with `npm run create-admin`.
  const { lastInsertRowid } = db
    .prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'user')")
    .run(name, email, passwordHash)

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(lastInsertRowid)
  setAuthCookie(res, signToken(user))
  res.status(201).json({ user: publicUser(user) })
})

router.post('/login', async (req, res) => {
  const email = req.body.email?.trim().toLowerCase()
  const password = req.body.password ?? ''

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  // Same message for wrong email and wrong password, so attackers can't find valid emails
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  setAuthCookie(res, signToken(user))
  res.json({ user: publicUser(user) })
})

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME)
  res.json({ message: 'Logged out' })
})

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

export default router
