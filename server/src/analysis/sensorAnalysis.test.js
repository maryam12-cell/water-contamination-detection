import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSensorReadings } from './sensorAnalysis.js'

const clean = { ph: 7.5, turbidity: 0, tds: 0 }

test('perfectly clean water is safe with full confidence', () => {
  const r = analyzeSensorReadings(clean)
  assert.equal(r.isContaminated, false)
  assert.equal(r.confidence, 1)
  assert.deepEqual(r.reasons, [])
})

test('readings exactly on the limits are still safe, at 50% confidence', () => {
  for (const readings of [
    { ...clean, ph: 6.0 },
    { ...clean, ph: 9.0 },
    { ...clean, turbidity: 10 },
    { ...clean, tds: 500 },
  ]) {
    const r = analyzeSensorReadings(readings)
    assert.equal(r.isContaminated, false, JSON.stringify(readings))
    assert.equal(r.confidence, 0.5, JSON.stringify(readings))
  }
})

test('each rule on its own marks the sample contaminated', () => {
  for (const [readings, param] of [
    [{ ...clean, ph: 5.9 }, 'ph'],
    [{ ...clean, ph: 9.1 }, 'ph'],
    [{ ...clean, turbidity: 10.5 }, 'turbidity'],
    [{ ...clean, tds: 501 }, 'tds'],
  ]) {
    const r = analyzeSensorReadings(readings)
    assert.equal(r.isContaminated, true, JSON.stringify(readings))
    assert.deepEqual(r.checks.filter((c) => c.exceeded).map((c) => c.parameter), [param])
    assert.equal(r.reasons.length, 1)
  }
})

test('confidence grows the further a reading is beyond its limit', () => {
  const slightly = analyzeSensorReadings({ ...clean, tds: 550 }) // 10% over
  const badly = analyzeSensorReadings({ ...clean, tds: 1000 }) // 100% over
  assert.equal(slightly.confidence, 0.55)
  assert.equal(badly.confidence, 1)
  assert.equal(analyzeSensorReadings({ ...clean, ph: 4 }).confidence, 1)
})

test('contaminated confidence uses the worst reading; safe uses the closest to a limit', () => {
  const bad = analyzeSensorReadings({ ph: 9.2, turbidity: 30, tds: 600 }) // turbidity is 200% over
  assert.equal(bad.confidence, 1)
  assert.equal(bad.reasons.length, 3)

  const safe = analyzeSensorReadings({ ph: 7.5, turbidity: 2, tds: 400 }) // TDS 20% under limit is closest
  assert.equal(safe.confidence, 0.6)
})
