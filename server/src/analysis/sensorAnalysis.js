// Rule-based water quality check using sensor readings.
// A sample is "contaminated" if ANY rule is broken:
//   pH < 6.0 or pH > 9.0,  turbidity > 10 NTU,  TDS > 500 mg/L
//
// Confidence (0.5 – 1.0):
//   contaminated -> how far the WORST reading is beyond its limit
//   safe         -> how far the CLOSEST-to-limit reading is inside its limit
// A reading exactly on a limit gives 0.5 ("can't be sure").

export const SENSOR_MODEL_VERSION = 'sensor-thresholds-v1'

export const THRESHOLDS = {
  ph: { label: 'pH', unit: '', min: 6.0, max: 9.0 },
  turbidity: { label: 'Turbidity', unit: 'NTU', max: 10 },
  tds: { label: 'TDS', unit: 'mg/L', max: 500 },
}

const clamp01 = (x) => Math.min(1, Math.max(0, x))

// Returns a score in [0, 1]: how strongly this reading is outside (exceeded) or inside (safe) its limit
function checkReading(key, value) {
  const { min, max } = THRESHOLDS[key]

  if (key === 'ph') {
    // 1 pH unit beyond the limit = fully certain; middle of 6–9 (7.5) = fully safe
    if (value < min) return { exceeded: true, score: clamp01(min - value) }
    if (value > max) return { exceeded: true, score: clamp01(value - max) }
    const halfRange = (max - min) / 2
    return { exceeded: false, score: clamp01(Math.min(value - min, max - value) / halfRange) }
  }

  // Upper-limit-only readings: double the limit = fully certain; zero = fully safe
  if (value > max) return { exceeded: true, score: clamp01((value - max) / max) }
  return { exceeded: false, score: clamp01((max - value) / max) }
}

function describeLimit({ min, max, unit }) {
  const u = unit ? ` ${unit}` : ''
  return min !== undefined ? `${min}–${max}${u}` : `≤ ${max}${u}`
}

/**
 * @param {{ ph: number, turbidity: number, tds: number }} readings
 * @returns {{ isContaminated: boolean, confidence: number, checks: object[], reasons: string[], modelVersion: string }}
 */
export function analyzeSensorReadings(readings) {
  const checks = Object.keys(THRESHOLDS).map((key) => {
    const value = readings[key]
    const { exceeded, score } = checkReading(key, value)
    const { label, unit } = THRESHOLDS[key]
    return { parameter: key, label, value, unit, limit: describeLimit(THRESHOLDS[key]), exceeded, score }
  })

  const failed = checks.filter((c) => c.exceeded)
  const isContaminated = failed.length > 0

  const certainty = isContaminated
    ? Math.max(...failed.map((c) => c.score))
    : Math.min(...checks.map((c) => c.score))
  const confidence = Math.round((0.5 + 0.5 * certainty) * 100) / 100

  const reasons = failed.map(
    (c) => `${c.label} ${c.value}${c.unit ? ' ' + c.unit : ''} is outside the safe limit (${c.limit})`,
  )

  return {
    isContaminated,
    confidence,
    checks: checks.map(({ score, ...rest }) => rest),
    reasons,
    modelVersion: SENSOR_MODEL_VERSION,
  }
}
