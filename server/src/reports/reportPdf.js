// Builds the downloadable PDF report for one analysis using PDFKit.
import PDFDocument from 'pdfkit'
import fs from 'node:fs'

export const PROJECT_NAME = 'Water Contamination Detection & Crop Recommendation'

const COLORS = {
  brand: '#0369a1',
  text: '#1e293b',
  muted: '#64748b',
  border: '#e2e8f0',
  headerFill: '#f1f5f9',
  red: '#b91c1c',
  redFill: '#fef2f2',
  green: '#15803d',
  greenFill: '#f0fdf4',
}

const PAGE_MARGIN = 50

// The built-in Helvetica font only covers Western characters. Text in other scripts
// (e.g. an Urdu location typed by the user) would print as garbage, so replace it.
const PRINTABLE = /^[\x20-\x7E -ÿ–—‘’“”•…]*$/
function pdfText(value) {
  if (value === null || value === undefined || value === '') return '—'
  const text = String(value)
  return PRINTABLE.test(text) ? text : '(non-English text, see the app)'
}

const formatDate = (date) => date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
// SQLite stores UTC without a zone marker
const fromSqlite = (sqliteDate) => new Date(sqliteDate + 'Z')

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')

/**
 * @param {object} report
 * @param {string} report.reportId
 * @param {{ isContaminated: boolean, confidence: number, modelVersion: string, notes: string, createdAt: string }} report.analysis
 * @param {{ sourceType: string, location: string, ph: number, turbidity: number, tds: number, temperature: number, imageFile: string|null, createdAt: string }} report.sample
 * @param {{ name: string, email: string }} report.user
 * @param {{ parameter: string, label: string, value: number, unit: string, limit: string, exceeded: boolean }[]} report.checks
 * @param {{ cropName: string, minPh: number, maxPh: number, isSuitable: boolean, score: number, reason: string }[]} report.crops
 * @returns {Promise<Buffer>}
 */
export function buildReportPdf(report) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: PAGE_MARGIN,
      bufferPages: true, // needed to add page numbers at the end
      info: { Title: `Water Quality Report ${report.reportId}`, Author: PROJECT_NAME },
    })
    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    try {
      drawReport(doc, report)
      drawFooters(doc, report.reportId)
      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}

function drawReport(doc, { reportId, analysis, sample, user, checks, crops }) {
  const contentWidth = doc.page.width - PAGE_MARGIN * 2

  // Header band
  doc.rect(0, 0, doc.page.width, 90).fill(COLORS.brand)
  doc.fillColor('white').font('Helvetica-Bold').fontSize(16).text(PROJECT_NAME, PAGE_MARGIN, 28, { width: contentWidth })
  doc.font('Helvetica').fontSize(11).text('Water Quality Analysis Report', PAGE_MARGIN, 52)
  doc.y = 110

  // Report details on the left, uploaded image on the right
  const details = [
    ['Report ID', reportId],
    ['Report generated', formatDate(new Date())],
    ['Sample analysed', formatDate(fromSqlite(analysis.createdAt))],
    ['Submitted by', `${pdfText(user.name)} (${user.email})`],
    ['Water body', capitalize(sample.sourceType) || '—'],
    ['Location', pdfText(sample.location)],
  ]
  const imageWidth = 250
  const detailsWidth = contentWidth - imageWidth - 20
  const top = doc.y
  let y = top
  for (const [label, value] of details) {
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted).text(label.toUpperCase(), PAGE_MARGIN, y, { width: detailsWidth })
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.text).text(value, PAGE_MARGIN, y + 11, { width: detailsWidth })
    y = doc.y + 9
  }
  const imageHeight = Math.max(y - top - 9, 180)
  drawImage(doc, sample.imageFile, PAGE_MARGIN + contentWidth - imageWidth, top, imageWidth, imageHeight)
  doc.y = Math.max(y, top + imageHeight) + 4

  // Result box
  sectionTitle(doc, 'Analysis Result')
  const contaminated = analysis.isContaminated
  const boxTop = doc.y
  const boxHeight = 62
  doc
    .roundedRect(PAGE_MARGIN, boxTop, contentWidth, boxHeight, 6)
    .fillAndStroke(contaminated ? COLORS.redFill : COLORS.greenFill, contaminated ? COLORS.red : COLORS.green)
  doc
    .fillColor(contaminated ? COLORS.red : COLORS.green)
    .font('Helvetica-Bold')
    .fontSize(20)
    .text(contaminated ? 'CONTAMINATED' : 'SAFE', PAGE_MARGIN + 16, boxTop + 12)
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(COLORS.text)
    .text(contaminated ? 'Not suitable for irrigation' : 'Suitable for irrigation', PAGE_MARGIN + 16, boxTop + 38)
  doc
    .font('Helvetica-Bold')
    .fontSize(20)
    .fillColor(COLORS.text)
    .text(`${Math.round(analysis.confidence * 100)}%`, PAGE_MARGIN, boxTop + 12, { width: contentWidth - 16, align: 'right' })
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(COLORS.muted)
    .text('Confidence score', PAGE_MARGIN, boxTop + 38, { width: contentWidth - 16, align: 'right' })
  doc.y = boxTop + boxHeight + 6
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(COLORS.muted)
    .text(`Method: ${analysis.modelVersion || 'sensor thresholds'} (pH 6.0–9.0, turbidity max 10 NTU, TDS max 500 mg/L)`, PAGE_MARGIN)

  // Sensor readings
  sectionTitle(doc, 'Sensor Readings')
  const rows = checks.map((c) => [
    c.label,
    `${c.value}${c.unit ? ' ' + c.unit : ''}`,
    c.limit.replace('≤ ', 'max '),
    c.exceeded ? 'Out of range' : 'Normal',
  ])
  rows.push(['Temperature', `${sample.temperature} °C`, '—', 'Recorded'])
  drawTable(doc, {
    columns: [
      { header: 'Parameter', width: 0.28 },
      { header: 'Value', width: 0.24 },
      { header: 'Safe limit', width: 0.24 },
      { header: 'Status', width: 0.24 },
    ],
    rows,
    cellColor: (row, col) => (col === 3 ? (row[3] === 'Out of range' ? COLORS.red : row[3] === 'Normal' ? COLORS.green : null) : null),
  })

  // Crop recommendations
  sectionTitle(doc, 'Crop Recommendations', 120)
  if (contaminated) {
    const warnTop = doc.y
    doc.roundedRect(PAGE_MARGIN, warnTop, contentWidth, 50, 6).fillAndStroke(COLORS.redFill, COLORS.red)
    doc
      .fillColor(COLORS.red)
      .font('Helvetica-Bold')
      .fontSize(11)
      .text('This water is not safe for irrigation.', PAGE_MARGIN + 14, warnTop + 10, { width: contentWidth - 28 })
      .font('Helvetica')
      .fontSize(9)
      .text('No crops are recommended. Treat the water or use another source, then test again.', { width: contentWidth - 28 })
    doc.y = warnTop + 58
  } else {
    const suitable = crops.filter((c) => c.isSuitable).length
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COLORS.text)
      .text(`${suitable} of ${crops.length} crops are suitable for water with pH ${sample.ph} (FAO pH ranges).`, PAGE_MARGIN)
    doc.moveDown(0.5)
    drawTable(doc, {
      columns: [
        { header: 'Crop', width: 0.15 },
        { header: 'Ideal pH', width: 0.14 },
        { header: 'Suitability', width: 0.15 },
        { header: 'Score', width: 0.1 },
        { header: 'Reason', width: 0.46 },
      ],
      rows: crops.map((c) => [
        c.cropName,
        `${c.minPh?.toFixed(1)}–${c.maxPh?.toFixed(1)}`,
        c.isSuitable ? 'Suitable' : 'Unsuitable',
        `${Math.round(c.score)}/100`,
        c.reason,
      ]),
      cellColor: (row, col) => (col === 2 ? (row[2] === 'Suitable' ? COLORS.green : COLORS.muted) : null),
    })
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text('Score: 100 = pH in the middle of the crop’s range, 50 = on the edge of the range, 0 = outside the range.', PAGE_MARGIN)
  }
}

// Starts a new page if fewer than `needed` points are left
function ensureSpace(doc, needed) {
  if (doc.y + needed > doc.page.height - PAGE_MARGIN - 20) doc.addPage()
}

function sectionTitle(doc, title, keepWithNext = 60) {
  ensureSpace(doc, keepWithNext)
  doc.moveDown(1)
  doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.brand).text(title, PAGE_MARGIN)
  const y = doc.y + 2
  doc.moveTo(PAGE_MARGIN, y).lineTo(doc.page.width - PAGE_MARGIN, y).lineWidth(0.5).strokeColor(COLORS.border).stroke()
  doc.y = y + 8
}

function drawTable(doc, { columns, rows, cellColor }) {
  const contentWidth = doc.page.width - PAGE_MARGIN * 2
  const widths = columns.map((c) => c.width * contentWidth)
  const padding = 6

  const drawRow = (cells, { header = false } = {}) => {
    doc.font(header ? 'Helvetica-Bold' : 'Helvetica').fontSize(9)
    const height =
      Math.max(...cells.map((cell, i) => doc.heightOfString(String(cell), { width: widths[i] - padding * 2 }))) + padding * 2
    ensureSpace(doc, height)
    const y = doc.y
    if (header) doc.rect(PAGE_MARGIN, y, contentWidth, height).fill(COLORS.headerFill)
    let x = PAGE_MARGIN
    cells.forEach((cell, i) => {
      const color = header ? COLORS.muted : (cellColor?.(cells, i) ?? COLORS.text)
      doc.fillColor(color).text(String(cell), x + padding, y + padding, { width: widths[i] - padding * 2 })
      x += widths[i]
    })
    doc.moveTo(PAGE_MARGIN, y + height).lineTo(PAGE_MARGIN + contentWidth, y + height).lineWidth(0.5).strokeColor(COLORS.border).stroke()
    doc.y = y + height
  }

  drawRow(columns.map((c) => c.header), { header: true })
  rows.forEach((row) => drawRow(row))
  doc.moveDown(0.5)
}

// Uploaded photo inside a grey box; shows a note instead if the file is missing or unreadable
function drawImage(doc, imageFile, x, y, width, height) {
  doc.rect(x, y, width, height).fill(COLORS.headerFill)
  try {
    if (!imageFile || !fs.existsSync(imageFile)) throw new Error('missing')
    doc.image(imageFile, x, y, { fit: [width, height], align: 'center', valign: 'center' })
  } catch {
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(COLORS.muted)
      .text('Image not available', x, y + height / 2 - 6, { width, align: 'center' })
  }
  doc.font('Helvetica').fontSize(7).fillColor(COLORS.muted).text('Uploaded image', x, y + height + 3, { width, align: 'center' })
}

function drawFooters(doc, reportId) {
  const range = doc.bufferedPageRange()
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i)
    const y = doc.page.height - PAGE_MARGIN + 10
    // Writing below the bottom margin would make PDFKit add a page, so lift the margin temporarily
    const bottom = doc.page.margins.bottom
    doc.page.margins.bottom = 0
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text(`${reportId}  ·  Generated by the ${PROJECT_NAME} system`, PAGE_MARGIN, y, { lineBreak: false })
      .text(`Page ${i + 1} of ${range.count}`, PAGE_MARGIN, y, { width: doc.page.width - PAGE_MARGIN * 2, align: 'right' })
    doc.page.margins.bottom = bottom
  }
}
