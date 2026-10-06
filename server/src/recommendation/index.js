// Saves and loads crop recommendations for an analysis result.
import db from '../db.js'
import { recommendCrops } from './cropRecommendation.js'

const insertCrop = db.prepare(`
  INSERT OR IGNORE INTO crop_recommendations (analysis_id, crop_name, is_suitable, suitability_score, reason)
  VALUES (@analysisId, @cropName, @isSuitable, @score, @reason)
`)

const selectCrops = db.prepare(`
  SELECT crop_name, is_suitable, suitability_score, reason
  FROM crop_recommendations
  WHERE analysis_id = ?
  ORDER BY suitability_score DESC, crop_name
`)

/**
 * Writes recommendations for a safe sample. Contaminated water gets none.
 * Call inside the same transaction that saves the analysis.
 */
export function saveCropRecommendations(analysisId, { isContaminated, ph }) {
  if (isContaminated) return
  for (const crop of recommendCrops(ph)) {
    insertCrop.run({ analysisId, ...crop, isSuitable: crop.isSuitable ? 1 : 0 })
  }
}

/**
 * Returns saved recommendations, creating them first for older safe analyses
 * that were saved before this feature existed.
 */
export function getCropRecommendations(analysisId, { isContaminated, ph }) {
  if (isContaminated) return []

  let rows = selectCrops.all(analysisId)
  if (rows.length === 0) {
    db.transaction(() => saveCropRecommendations(analysisId, { isContaminated, ph }))()
    rows = selectCrops.all(analysisId)
  }

  // Ranges come from the current crop table, so the UI can draw them
  const ranges = Object.fromEntries(recommendCrops(ph).map((c) => [c.cropName, c]))
  return rows.map((r) => ({
    cropName: r.crop_name,
    isSuitable: r.is_suitable === 1,
    score: r.suitability_score,
    reason: r.reason,
    minPh: ranges[r.crop_name]?.minPh,
    maxPh: ranges[r.crop_name]?.maxPh,
  }))
}
