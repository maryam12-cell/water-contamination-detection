import { test } from 'node:test'
import assert from 'node:assert/strict'
import { recommendCrops } from './cropRecommendation.js'

const byName = (results) => Object.fromEntries(results.map((r) => [r.cropName, r]))

test('pH 7.8 only suits cotton, with reasons for the others', () => {
  const r = byName(recommendCrops(7.8))
  assert.equal(r.Cotton.isSuitable, true)
  assert.equal(r.Wheat.isSuitable, false)
  assert.equal(r.Wheat.reason, "pH 7.8 is above Wheat's range (6.0–7.5)")
  assert.equal(r.Rice.isSuitable, false)
  assert.equal(r.Sugarcane.isSuitable, false)
})

test('pH below a range gives a "below" reason', () => {
  const r = byName(recommendCrops(5.7))
  assert.equal(r.Rice.isSuitable, true)
  assert.equal(r.Wheat.reason, "pH 5.7 is below Wheat's range (6.0–7.5)")
})

test('range edges count as suitable with score 50; the middle scores 100', () => {
  assert.equal(byName(recommendCrops(7.5)).Wheat.isSuitable, true)
  assert.equal(byName(recommendCrops(7.5)).Wheat.score, 50)
  assert.equal(byName(recommendCrops(6.0)).Cotton.score, 50)
  assert.equal(byName(recommendCrops(7.0)).Cotton.score, 100)
  assert.equal(byName(recommendCrops(8.1)).Cotton.score, 0)
})

test('pH 6.5 suits all four crops', () => {
  assert.ok(recommendCrops(6.5).every((c) => c.isSuitable))
})

test('results are sorted best first', () => {
  const scores = recommendCrops(6.8).map((c) => c.score)
  assert.deepEqual(scores, [...scores].sort((a, b) => b - a))
})
