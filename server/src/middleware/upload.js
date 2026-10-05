import multer from 'multer'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const SERVER_ROOT = path.join(__dirname, '..', '..')
export const UPLOAD_DIR = path.join(SERVER_ROOT, 'uploads')
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024

fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png']
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png']

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  // Random file name so users can't overwrite each other's files or guess paths
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${crypto.randomUUID()}${ext}`)
  },
})

const multerUpload = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (ALLOWED_EXTENSIONS.includes(ext) && ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new UploadError('Only JPG, JPEG or PNG images are allowed'))
    }
  },
})

class UploadError extends Error {}

// Checks the first bytes of the file, so a renamed non-image file is rejected
function hasImageSignature(filePath) {
  const fd = fs.openSync(filePath, 'r')
  const header = Buffer.alloc(8)
  fs.readSync(fd, header, 0, 8, 0)
  fs.closeSync(fd)
  const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff
  const isPng = header.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  return isJpeg || isPng
}

export function removeUploadedFile(file) {
  if (file) fs.rm(file.path, { force: true }, () => {})
}

// Accepts one image in the form field `fieldName` and turns upload problems into 400 responses
export function uploadImage(fieldName) {
  const handler = multerUpload.single(fieldName)

  return (req, res, next) => {
    handler(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'Image must be 10 MB or smaller' })
        }
        if (err instanceof UploadError || err instanceof multer.MulterError) {
          return res.status(400).json({ error: err.message })
        }
        return next(err)
      }
      if (req.file && !hasImageSignature(req.file.path)) {
        removeUploadedFile(req.file)
        return res.status(400).json({ error: 'The file is not a valid JPG or PNG image' })
      }
      next()
    })
  }
}
