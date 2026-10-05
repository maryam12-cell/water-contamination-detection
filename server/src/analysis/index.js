// Single entry point for analysing a water sample. Routes call analyzeSample()
// and don't need to know which methods (sensor rules, CNN, ...) produced the result.
import { analyzeSensorReadings } from './sensorAnalysis.js'

/**
 * @param {{ readings: { ph: number, turbidity: number, tds: number, temperature: number }, imagePath: string }} sample
 * @returns {Promise<{ isContaminated: boolean, confidence: number, modelVersion: string, checks: object[], reasons: string[] }>}
 */
export async function analyzeSample({ readings, imagePath }) {
  const sensor = analyzeSensorReadings(readings)

  // ---------------------------------------------------------------------------
  // TODO (CNN): when the Flask MobileNet service is ready, add the image result here:
  //
  //   const cnn = await predictImage(imagePath)   // e.g. POST http://localhost:5000/predict
  //   // cnn = { isContaminated: boolean, confidence: number, modelVersion: 'mobilenet-v1' }
  //   return combineResults(sensor, cnn)
  //
  // combineResults decides the final status (e.g. contaminated if either says so,
  // or a weighted average of confidences) and merges modelVersion / reasons.
  // Nothing outside this folder needs to change.
  // ---------------------------------------------------------------------------
  void imagePath

  return sensor
}
