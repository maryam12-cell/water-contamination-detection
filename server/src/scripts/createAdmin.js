// Usage: npm run create-admin -- <email> <password> [name]
// Creates a new admin, or promotes an existing user to admin (and resets their password).
import bcrypt from 'bcryptjs'
import db from '../db.js'

const [email, password, name = 'Admin'] = process.argv.slice(2)

if (!email || !password) {
  console.error('Usage: npm run create-admin -- <email> <password> [name]')
  process.exit(1)
}
if (password.length < 8) {
  console.error('Password must be at least 8 characters')
  process.exit(1)
}

const normalizedEmail = email.trim().toLowerCase()
const passwordHash = bcrypt.hashSync(password, 10)
const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail)

if (existing) {
  db.prepare("UPDATE users SET role = 'admin', password_hash = ? WHERE id = ?").run(passwordHash, existing.id)
  console.log(`Promoted ${normalizedEmail} to admin`)
} else {
  db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')")
    .run(name, normalizedEmail, passwordHash)
  console.log(`Created admin ${normalizedEmail}`)
}
