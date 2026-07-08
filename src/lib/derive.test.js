import { describe, expect, it } from 'vitest'
import { derive } from './derive.js'
import { solve } from './solve.js'
import { defaultState } from './defaultState.js'

describe('derive', () => {
  it('summarizes warm vs cold rooms and installed power', () => {
    const s = defaultState()
    const temps = solve(s.floors, -10)
    const d = derive(s.floors, temps, 21)
    expect(d.total).toBe(9)
    expect(d.okCount + d.coldRooms.length).toBe(9)
    expect(d.totalKw).toBeCloseTo(8.0, 1) // 2+1.2+0.8+1 + 1.2+1+0.8
    expect(typeof d.allOk).toBe('boolean')
    if (d.coldRooms.length) {
      expect(d.coldRooms[0].needStr.startsWith('+')).toBe(true)
      expect(d.coldRooms[0].tempStr.endsWith('°')).toBe(true)
    }
  })
})
