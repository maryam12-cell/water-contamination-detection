// pH-based crop suitability for irrigation water (FAO pH ranges).
// Only used when the water is NOT contaminated — contaminated water gets no crops.
//
// Suitability score (0–100):
//   pH in the middle of the crop's range -> 100
//   pH exactly on the edge of the range  -> 50
//   pH outside the range                 -> 0 (unsuitable)

export const CROPS = [
  { name: 'Wheat', minPh: 6.0, maxPh: 7.5 },
  { name: 'Rice', minPh: 5.5, maxPh: 7.0 },
  { name: 'Cotton', minPh: 6.0, maxPh: 8.0 },
  { name: 'Sugarcane', minPh: 6.0, maxPh: 7.5 },
]

const fmt = (n) => n.toFixed(1)

function assessCrop({ name, minPh, maxPh }, ph) {
  const range = `${fmt(minPh)}–${fmt(maxPh)}`

  if (ph < minPh) {
    return { cropName: name, minPh, maxPh, isSuitable: false, score: 0, reason: `pH ${ph} is below ${name}'s range (${range})` }
  }
  if (ph > maxPh) {
    return { cropName: name, minPh, maxPh, isSuitable: false, score: 0, reason: `pH ${ph} is above ${name}'s range (${range})` }
  }

  const halfRange = (maxPh - minPh) / 2
  const distanceFromEdge = Math.min(ph - minPh, maxPh - ph)
  const score = Math.round(50 + 50 * (distanceFromEdge / halfRange))
  return { cropName: name, minPh, maxPh, isSuitable: true, score, reason: `pH ${ph} is within ${name}'s range (${range})` }
}

/**
 * @param {number} ph
 * @returns {{ cropName: string, minPh: number, maxPh: number, isSuitable: boolean, score: number, reason: string }[]}
 *   Sorted best first: suitable crops by score, then unsuitable ones.
 */
export function recommendCrops(ph) {
  return CROPS.map((crop) => assessCrop(crop, ph)).sort((a, b) => b.score - a.score)
}
