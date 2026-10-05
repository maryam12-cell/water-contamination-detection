import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import db from './db.js'
import authRoutes from './routes/auth.js'
import adminRoutes from './routes/admin.js'
import sampleRoutes from './routes/samples.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
app.use(express.json())
app.use(cookieParser())

app.get('/api/health', (req, res) => {
  const { ok } = db.prepare('SELECT 1 AS ok').get()
  res.json({ status: 'ok', database: ok === 1 ? 'connected' : 'error' })
})

app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/samples', sampleRoutes)

// Unknown API routes
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }))

// Last-resort error handler
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Something went wrong on the server' })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
