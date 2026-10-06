// Human-friendly report ID, e.g. analysis 37 created in 2026 -> "WCD-2026-000037"
export function reportId(analysisId, createdAt) {
  const year = String(createdAt).slice(0, 4)
  return `WCD-${year}-${String(analysisId).padStart(6, '0')}`
}
