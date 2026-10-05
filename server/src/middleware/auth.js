import jwt from 'jsonwebtoken'
import db from '../db.js'

export const COOKIE_NAME = 'token'
const TOKEN_TTL = '7d'

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not set. Copy server/.env.example to server/.env and set it.')
}

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: TOKEN_TTL })
}

export function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
}

// Verifies the JWT cookie and attaches the current user to req.user
export function requireAuth(req, res, next) {
  const token = req.cookies[COOKIE_NAME]
  if (!token) return res.status(401).json({ error: 'Not logged in' })

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const user = db
      .prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?')
      .get(payload.sub)
    if (!user) return res.status(401).json({ error: 'User no longer exists' })
    req.user = user
    next()
  } catch {
    return res.status(401).json({ error: 'Session expired, please log in again' })
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'You do not have permission to do this' })
    }
    next()
  }
}
