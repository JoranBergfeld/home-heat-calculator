// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { STORAGE_KEY, load, save, serialize, parseImport } from './storage.js'
import { defaultState } from './defaultState.js'

afterEach(() => localStorage.clear())

describe('storage', () => {
  it('returns default state when nothing is stored', () => {
    expect(load().floors.length).toBe(2)
  })

  it('round-trips saved state', () => {
    const s = defaultState()
    s.comfort = 19
    s.showGrid = false
    save(s)
    const loaded = load()
    expect(loaded.comfort).toBe(19)
    expect(loaded.showGrid).toBe(false)
    expect(loaded.selected).toBe(null)
  })

  it('falls back to default on corrupt storage', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')
    expect(load().floors.length).toBe(2)
  })

  it('serialize/parseImport round-trip', () => {
    const s = defaultState()
    const parsed = parseImport(serialize(s))
    expect(parsed.floors.length).toBe(2)
  })

  it('parseImport rejects input without a floors array', () => {
    expect(parseImport('{"foo":1}')).toBe(null)
    expect(parseImport('not json')).toBe(null)
  })
})
