import { describe, expect, it } from 'vitest'
import { solve } from './solve.js'

const room = (over = {}) => ({
  id: 'r1', name: 'R', x: 0, y: 0, w: 4, h: 4,
  insulation: 'average', windows: 0, sources: [], ...over,
})
const floor = (rooms, over = {}) => ({ id: 'f', name: 'F', rooms, stairs: [], ...over })

describe('solve', () => {
  it('heats an isolated room to its steady state', () => {
    const floors = [floor([room({ sources: [{ id: 's', type: 'radiator', power: 2 }] })])]
    const t = solve(floors, 0).get('r1').t
    expect(t).toBeCloseTo(30.39, 1) // (2000 + 64) / 67.92
  })

  it('leaves an unheated room near the ground/outside blend', () => {
    const info = solve([floor([room()])], 0).get('r1')
    expect(info.t).toBeCloseTo(0.94, 1) // 64 / 67.92
    expect(info.G).toBeCloseTo(67.92, 1)
  })

  it('raises temperature monotonically with power', () => {
    const lo = solve([floor([room({ sources: [{ id: 's', type: 'electric', power: 0.5 }] })])], 0).get('r1').t
    const hi = solve([floor([room({ sources: [{ id: 's', type: 'electric', power: 2 }] })])], 0).get('r1').t
    expect(hi).toBeGreaterThan(lo)
  })

  it('lets a hot room warm a cold neighbour through a shared wall', () => {
    const hot = room({ id: 'h', x: 0, w: 4, sources: [{ id: 's', type: 'stove', power: 6 }] })
    const cold = room({ id: 'c', x: 4, w: 4, sources: [] })
    const together = solve([floor([hot, cold])], 0).get('c').t
    const alone = solve([floor([room({ id: 'c', x: 4 })])], 0).get('c').t
    expect(together).toBeGreaterThan(alone)
  })

  it('returns an empty map for no rooms', () => {
    expect(solve([floor([])], 0).size).toBe(0)
  })
})
