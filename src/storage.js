const savedSetupsKey = 'home-heat-calculator.saved-setups'
const draftKey = 'home-heat-calculator.draft'

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

const readJson = (key, fallbackValue) => {
  if (!canUseStorage()) {
    return fallbackValue
  }

  try {
    const value = window.localStorage.getItem(key)

    if (!value) {
      return fallbackValue
    }

    return JSON.parse(value)
  } catch {
    return fallbackValue
  }
}

const writeJson = (key, value) => {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(key, JSON.stringify(value))
}

export const loadSavedSetups = () => readJson(savedSetupsKey, [])
export const saveSavedSetups = (setups) => writeJson(savedSetupsKey, setups)
export const loadDraft = () => readJson(draftKey, null)
export const saveDraft = (draft) => writeJson(draftKey, draft)
