// The server always replies in English. This maps its error messages to translation keys.

const EXACT = {
  'Name, email and password are required': 'error.nameEmailPasswordRequired',
  'Please enter a valid email': 'error.invalidEmail',
  'Password must be at least 8 characters': 'auth.passwordTooShort',
  'An account with this email already exists': 'error.emailExists',
  'Email and password are required': 'error.emailPasswordRequired',
  'Invalid email or password': 'error.invalidLogin',
  'Not logged in': 'error.notLoggedIn',
  'User no longer exists': 'error.sessionExpired',
  'Session expired, please log in again': 'error.sessionExpired',
  'You do not have permission to do this': 'error.noPermission',
  'Not found': 'error.notFound',
  'Analysis not found': 'error.analysisNotFound',
  'Report not found': 'error.reportNotFound',
  'Dates must be in YYYY-MM-DD format': 'error.dateFormat',
  'The start date must be before the end date': 'error.dateOrder',
  'Something went wrong on the server': 'error.generic',
  'Request failed': 'error.generic',
  'Image must be 10 MB or smaller': 'upload.tooBig',
  'Only JPG, JPEG or PNG images are allowed': 'upload.badType',
  'The file is not a valid JPG or PNG image': 'error.notValidImage',
  'Please upload an image of the water source': 'error.imageRequired',
}

const FIELD_KEYS = { pH: 'ph', Turbidity: 'turbidity', TDS: 'tds', Temperature: 'temperature' }

const PATTERNS = [
  [/^(pH|Turbidity|TDS|Temperature) is required and must be a number$/, 'error.fieldRequired', (m) => ({ field: FIELD_KEYS[m[1]] })],
  [/^(pH|Turbidity|TDS|Temperature) must be between (-?[\d.]+) and (-?[\d.]+)$/, 'error.fieldRange', (m) => ({ field: FIELD_KEYS[m[1]], min: m[2], max: m[3] })],
  [/^Water body type must be one of/, 'error.waterBodyType', () => ({})],
]

/** @returns {{ key: string, vars?: object } | null} `vars.field` is a param key (e.g. 'ph') still to be translated */
export function serverMessageKey(message) {
  if (EXACT[message]) return { key: EXACT[message], vars: { mb: 10 } }
  for (const [regex, key, toVars] of PATTERNS) {
    const m = message.match(regex)
    if (m) return { key, vars: toVars(m) }
  }
  return null
}
