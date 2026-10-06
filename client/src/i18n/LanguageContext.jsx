import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { en, ur } from './translations'
import { serverMessageKey } from './serverMessages'

const DICTIONARIES = { en, ur }
const STORAGE_KEY = 'language'
const LanguageContext = createContext(null)

function readSavedLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'ur' ? 'ur' : 'en'
  } catch {
    return 'en'
  }
}

// Unicode "first strong isolate" marks. In right-to-left text they stop the browser from
// reordering a value's characters, e.g. a range "5.5–7.0" showing up as "7.0–5.5".
const ISOLATE_START = '⁨'
const ISOLATE_END = '⁩'

// Replaces {name} placeholders with values
function fill(text, vars, isolate) {
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (match, name) => {
    if (!(name in vars)) return match
    return isolate ? `${ISOLATE_START}${vars[name]}${ISOLATE_END}` : String(vars[name])
  })
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(readSavedLanguage)

  // Urdu is written right-to-left; `dir` flips the whole layout
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr'
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      // Storage can be blocked (e.g. private mode); the choice then lasts for this visit only
    }
  }, [lang])

  const t = useCallback(
    (key, vars) => fill(DICTIONARIES[lang][key] ?? en[key] ?? key, vars, lang === 'ur'),
    [lang],
  )

  // Translates an error from api() — server messages are always English
  const tError = useCallback(
    (err) => {
      if (err instanceof TypeError) return t('error.network') // fetch() itself failed
      const match = serverMessageKey(err?.message ?? '')
      if (!match) return err?.message || t('error.generic')
      const vars = match.vars?.field ? { ...match.vars, field: t(`param.${match.vars.field}`) } : match.vars
      return t(match.key, vars)
    },
    [t],
  )

  const value = useMemo(
    () => ({
      lang,
      setLang,
      isRtl: lang === 'ur',
      locale: lang === 'ur' ? 'ur-PK' : 'en-GB',
      t,
      tError,
    }),
    [lang, t, tError],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  return useContext(LanguageContext)
}
