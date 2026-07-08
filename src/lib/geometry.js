import { SCALE, WALL_HEIGHT } from './constants.js'

export function ov(a0, aw, b0, bw) {
  return Math.max(0, Math.min(a0 + aw, b0 + bw) - Math.max(a0, b0))
}

export function wallsFor(rm, others) {
  const S = SCALE
  const WH = WALL_HEIGHT * S
  const eps = 0.13
  const ins = 1.5
  const sh = { n: [], s: [], w: [], e: [] }
  others.forEach((b) => {
    let s0, s1
    if (Math.abs(b.y + b.h - rm.y) < eps) {
      s0 = Math.max(rm.x, b.x) - rm.x
      s1 = Math.min(rm.x + rm.w, b.x + b.w) - rm.x
      if (s1 - s0 > 0.3) sh.n.push({ s: s0, e: s1 })
    }
    if (Math.abs(b.y - (rm.y + rm.h)) < eps) {
      s0 = Math.max(rm.x, b.x) - rm.x
      s1 = Math.min(rm.x + rm.w, b.x + b.w) - rm.x
      if (s1 - s0 > 0.3) sh.s.push({ s: s0, e: s1 })
    }
    if (Math.abs(b.x + b.w - rm.x) < eps) {
      s0 = Math.max(rm.y, b.y) - rm.y
      s1 = Math.min(rm.y + rm.h, b.y + b.h) - rm.y
      if (s1 - s0 > 0.3) sh.w.push({ s: s0, e: s1 })
    }
    if (Math.abs(b.x - (rm.x + rm.w)) < eps) {
      s0 = Math.max(rm.y, b.y) - rm.y
      s1 = Math.min(rm.y + rm.h, b.y + b.h) - rm.y
      if (s1 - s0 > 0.3) sh.e.push({ s: s0, e: s1 })
    }
  })
  const freeOf = (L, list) => {
    const a = [...list].sort((p, q) => p.s - q.s)
    const out = []
    let cur = 0
    a.forEach((iv) => {
      if (iv.s - cur > 0.05) out.push({ s: cur, e: Math.min(iv.s, L) })
      cur = Math.max(cur, iv.e)
    })
    if (L - cur > 0.05) out.push({ s: cur, e: L })
    return out
  }
  const sides = [
    { k: 'n', L: rm.w },
    { k: 's', L: rm.w },
    { k: 'w', L: rm.h },
    { k: 'e', L: rm.h },
  ]
  const open = { n: [], s: [], w: [], e: [] }
  sides.forEach((sd) =>
    sh[sd.k].forEach((iv) => {
      if (iv.e - iv.s >= 0.95) {
        const c = (iv.s + iv.e) / 2
        open[sd.k].push({ p0: c - 0.45, p1: c + 0.45, h0: 0, h1: 2.05, door: true })
      }
    }),
  )
  const frees = []
  sides.forEach((sd) =>
    freeOf(sd.L, sh[sd.k]).forEach((f) => {
      if (f.e - f.s >= 1.4) frees.push({ k: sd.k, s: f.s, e: f.e })
    }),
  )
  const nWin = rm.windows || 0
  if (nWin && frees.length) {
    const per = new Array(frees.length).fill(0)
    for (let i = 0; i < nWin; i++) per[i % frees.length]++
    frees.forEach((f, i) => {
      const cnt = Math.min(per[i], Math.floor((f.e - f.s) / 1.4))
      for (let j = 0; j < cnt; j++) {
        const c = f.s + ((f.e - f.s) * (j + 1)) / (cnt + 1)
        open[f.k].push({ p0: c - 0.6, p1: c + 0.6, h0: 0.9, h1: 2.1, door: false })
      }
    })
  }
  const geo = {
    n: { left: 0, top: ins, width: rm.w * S, height: WH, origin: '50% 0', front: false, horiz: true },
    s: { left: 0, top: rm.h * S - ins, width: rm.w * S, height: WH, origin: '50% 0', front: true, horiz: true },
    w: { left: ins, top: 0, width: WH, height: rm.h * S, origin: '0 50%', front: true, horiz: false },
    e: { left: rm.w * S - ins, top: 0, width: WH, height: rm.h * S, origin: '0 50%', front: false, horiz: false },
  }
  return sides.map((sd) => {
    const g = geo[sd.k]
    const openings = open[sd.k].map((o) => {
      const rect = g.horiz
        ? { l: o.p0 * S, t: o.h0 * S, w: (o.p1 - o.p0) * S, h: (o.h1 - o.h0) * S }
        : { l: o.h0 * S, t: o.p0 * S, w: (o.h1 - o.h0) * S, h: (o.p1 - o.p0) * S }
      return {
        ...rect,
        bg: o.door ? '#b98e5e' : 'rgba(163,199,236,0.88)',
        border: o.door ? '1.5px solid #8f6a42' : '1.5px solid #64789a',
      }
    })
    return {
      left: g.left,
      top: g.top,
      width: g.width,
      height: g.height,
      origin: g.origin,
      xform: g.horiz ? 'rotateX(90deg)' : 'rotateY(-90deg)',
      bg: g.front ? 'rgba(206,213,224,0.22)' : '#d9dee8',
      bc: g.front ? 'rgba(150,160,178,0.45)' : '#bfc7d3',
      openings,
    }
  })
}
