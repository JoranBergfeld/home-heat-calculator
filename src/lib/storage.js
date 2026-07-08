import { defaultState } from './defaultState.js'

export const STORAGE_KEY = 'heatsim-v1'

function normalize(s) {
  if (!s || !Array.isArray(s.floors) || !s.floors.length) return null
  return {
    floors: s.floors.map((f) => ({ ...f, rooms: f.rooms || [], stairs: f.stairs || [] })),
    activeFloor: Math.max(0, Math.min(s.activeFloor || 0, s.floors.length - 1)),
    selected: null,
    outsideTemp: typeof s.outsideTemp === 'number' ? s.outsideTemp : 0,
    comfort: typeof s.comfort === 'number' ? s.comfort : 21,
    view: s.view === '2d' ? '2d' : '3d',
    showGrid: s.showGrid !== false,
    heatView: s.heatView === 'status' ? 'status' : 'heatmap',
  }
}

export function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const n = normalize(JSON.parse(raw))
      if (n) return n
    }
  } catch (e) {
    /* ignore */
  }
  return defaultState()
}

function persistShape(s) {
  return {
    floors: s.floors,
    activeFloor: s.activeFloor,
    outsideTemp: s.outsideTemp,
    comfort: s.comfort,
    view: s.view,
    showGrid: s.showGrid,
    heatView: s.heatView,
  }
}

export function save(s) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistShape(s)))
  } catch (e) {
    /* ignore */
  }
}

export function serialize(s) {
  return JSON.stringify(persistShape(s), null, 2)
}

export function parseImport(text) {
  try {
    return normalize(JSON.parse(text))
  } catch (e) {
    return null
  }
}

export function downloadJson(filename, text) {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
