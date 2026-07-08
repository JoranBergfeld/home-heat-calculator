import { describe, expect, it } from 'vitest'
import { ov, wallsFor } from './geometry.js'

describe('ov', () => {
  it('overlaps partial ranges', () => {
    expect(ov(0, 4, 2, 4)).toBe(2)
  })
  it('returns 0 for disjoint ranges', () => {
    expect(ov(0, 4, 5, 2)).toBe(0)
  })
  it('handles nested ranges', () => {
    expect(ov(0, 4, 1, 2)).toBe(2)
  })
})

describe('wallsFor', () => {
  const room = { x: 0, y: 0, w: 4, h: 4 }

  it('returns four walls', () => {
    expect(wallsFor(room, [])).toHaveLength(4)
  })

  it('distributes N windows across exterior free segments', () => {
    const walls = wallsFor({ ...room, windows: 2 }, [])
    const windows = walls.flatMap((w) => w.openings).filter((o) => o.bg.startsWith('rgba(163'))
    // note: windows arg is read off rm.windows
    expect(windows).toHaveLength(2)
  })

  it('puts a door on a wall shared with a neighbour', () => {
    const neighbour = { x: 4, y: 0, w: 4, h: 4 } // touches east wall of room
    const walls = wallsFor({ ...room, windows: 0 }, [neighbour])
    const doors = walls.flatMap((w) => w.openings).filter((o) => o.bg === '#b98e5e')
    expect(doors).toHaveLength(1)
  })
})
