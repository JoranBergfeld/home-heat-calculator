import { INS, WALL_HEIGHT, GROUND_TEMP } from './constants.js'
import { ov } from './geometry.js'

export function solve(floors, outsideTemp) {
  const Tout = outsideTemp
  const H = WALL_HEIGHT
  const nodes = []
  floors.forEach((f, fi) => f.rooms.forEach((r) => nodes.push({ r, fi })))
  const n = nodes.length
  const res = new Map()
  if (!n) return res
  const pairs = []
  const shared = new Array(n).fill(0)
  const coverAbove = new Array(n).fill(0)
  const coverBelow = new Array(n).fill(0)
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      const A = nodes[i], B = nodes[j], a = A.r, b = B.r
      if (A.fi === B.fi) {
        let len = 0
        if (Math.abs(a.x + a.w - b.x) < 0.13 || Math.abs(b.x + b.w - a.x) < 0.13) len = ov(a.y, a.h, b.y, b.h)
        if (Math.abs(a.y + a.h - b.y) < 0.13 || Math.abs(b.y + b.h - a.y) < 0.13) len = Math.max(len, ov(a.x, a.w, b.x, b.w))
        if (len > 0.3) {
          pairs.push({ i, j, G: len * H * 2.0 })
          shared[i] += len
          shared[j] += len
        }
      } else if (Math.abs(A.fi - B.fi) === 1) {
        const ar = ov(a.x, a.w, b.x, b.w) * ov(a.y, a.h, b.y, b.h)
        if (ar > 0.3) {
          pairs.push({ i, j, G: ar * 1.5 })
          if (A.fi < B.fi) {
            coverAbove[i] += ar
            coverBelow[j] += ar
          } else {
            coverAbove[j] += ar
            coverBelow[i] += ar
          }
        }
      }
    }
  const Gout = [], Ggnd = [], Q = []
  nodes.forEach((N, i) => {
    const r = N.r
    const ins = INS[r.insulation] || INS.average
    const area = r.w * r.h, vol = area * H, perim = 2 * (r.w + r.h)
    const extLen = Math.max(0, perim - shared[i])
    const winA = Math.min((r.windows || 0) * 1.6, extLen * H * 0.8)
    let g = Math.max(0, extLen * H - winA) * ins.u + winA * 2.6 + 0.33 * ins.ach * vol
    g += Math.max(0, area - coverAbove[i]) * ins.u * 0.85
    let gg = 0
    if (N.fi === 0) gg = area * 0.4
    else g += Math.max(0, area - coverBelow[i]) * 0.6
    Gout[i] = g
    Ggnd[i] = gg
    Q[i] = (r.sources || []).reduce((s, x) => s + x.power, 0) * 1000
  })
  const idx = new Map()
  nodes.forEach((N, i) => idx.set(N.r.id, i))
  floors.forEach((f, fi) => {
    if (fi >= floors.length - 1) return
    ;(f.stairs || []).forEach((t) => {
      const below = [], above = []
      floors[fi].rooms.forEach((r) => {
        const a = ov(t.x, t.w, r.x, r.w) * ov(t.y, t.h, r.y, r.h)
        if (a > 0.2) below.push([idx.get(r.id), a])
      })
      floors[fi + 1].rooms.forEach((r) => {
        const a = ov(t.x, t.w, r.x, r.w) * ov(t.y, t.h, r.y, r.h)
        if (a > 0.2) above.push([idx.get(r.id), a])
      })
      below.forEach(([i, a]) => above.forEach(([j, b]) => pairs.push({ i, j, G: Math.min(a, b) * 12 })))
    })
  })
  const adj = Array.from({ length: n }, () => [])
  pairs.forEach((p) => {
    adj[p.i].push([p.j, p.G])
    adj[p.j].push([p.i, p.G])
  })
  const T = new Array(n).fill(Math.max(Tout, 12))
  for (let it = 0; it < 200; it++) {
    for (let i = 0; i < n; i++) {
      let num = Q[i] + Gout[i] * Tout + Ggnd[i] * GROUND_TEMP
      let den = Gout[i] + Ggnd[i]
      for (const [j, G] of adj[i]) {
        num += G * T[j]
        den += G
      }
      T[i] = num / den
    }
  }
  nodes.forEach((N, i) => {
    let den = Gout[i] + Ggnd[i]
    for (const [j, G] of adj[i]) den += G
    res.set(N.r.id, { t: T[i], G: den })
  })
  return res
}
