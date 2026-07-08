# Home Heat Planner React Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the Claude Design prototype (`Home Heat Planner.dc.html` + `support.js`) into an idiomatic React/Vite app that persists to localStorage, plus grid/color toggles, reset, and JSON export/import.

**Architecture:** Pure logic modules (solver, geometry, color, constants) with no React; a `useHeatPlanner` hook owning state + drag + debounced persistence; presentational components (`Header`, `Canvas`, `Room`, `Stairs`, `Inspector`, `Footer`). `App` runs the solver once per render and threads results down as props. The physics constants and 3D CSS transforms are copied verbatim so results and visuals match the prototype exactly.

**Tech Stack:** Vite 8 + `@vitejs/plugin-react`, React 19, Vitest 4. IBM Plex Sans/Mono via Google Fonts.

## Global Constraints

- Physics constants are the spec — copy verbatim, do not "improve": `SCALE=52`, plan `17m × 11m`, wall height `2.5m`, ground `10°C`, `INS` u/ach values `1.8/0.9, 1.0/0.6, 0.45/0.35`, source kW ranges, and the coupling factors `wall len×2.5×2.0`, `overlap area×1.5`, `stair min(a,b)×12`, windows `count×1.6×2.6` capped at `80%` of exterior wall area.
- Persistence key is `heatsim-v1`; keep the existing shape so a prototype user's saved plan loads unchanged.
- Writing style for any prose/copy: match the prototype's exact strings (e.g. "Too cold — add ≈ X kW"). Use the em-dash / ≈ characters exactly as the prototype does in UI copy.
- IDs: `Math.random().toString(36).slice(2, 9)`, same as prototype.
- Snap to 0.25m; min room 1.5m, min stair 0.7m; clamp to plan bounds.
- Colors/spacing/typography are final-intent; copy inline style values exactly.

---

### Task 1: Project scaffolding

Replace the old form-based app (deleted in the working tree, still in git history) with a clean Vite React skeleton. No new deps beyond what the old `package.json` had.

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/main.jsx`
- Create: `src/index.css`
- Create: `src/App.jsx` (placeholder)
- Create: `.gitignore` entries (ensure `node_modules`, `dist`, `.vite` ignored)

**Interfaces:**
- Produces: a running `npm run dev` shell rendering "Home Heat Planner" so later tasks have somewhere to mount.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "home-heat-calculator",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^19.2.7",
    "react-dom": "^19.2.7"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^6.0.3",
    "vite": "^8.1.3",
    "vitest": "^4.1.10",
    "jsdom": "^25.0.1"
  }
}
```

- [ ] **Step 2: Write `vite.config.js`**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 3: Write `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Home Heat Planner</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Write `src/index.css`**

```css
html,
body {
  margin: 0;
  padding: 0;
  background: #edeff2;
}
* {
  box-sizing: border-box;
}
a {
  color: #2b5fc7;
}
a:hover {
  color: #1c439a;
}
input[type='range'] {
  accent-color: #2b5fc7;
}
```

- [ ] **Step 5: Write `src/main.jsx`**

```jsx
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(<App />)
```

- [ ] **Step 6: Write placeholder `src/App.jsx`**

```jsx
export default function App() {
  return <div>Home Heat Planner</div>
}
```

- [ ] **Step 7: Install and run dev to verify the shell boots**

Run: `npm install && npm run build`
Expected: build succeeds, `dist/` produced with no errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite React app, remove old form-based calculator"
```

---

### Task 2: Constants module

**Files:**
- Create: `src/lib/constants.js`

**Interfaces:**
- Produces: `SCALE` (52), `CW` (17), `CH` (11), `WALL_HEIGHT` (2.5), `GROUND_TEMP` (10), `INS` object, `SRC` object.

- [ ] **Step 1: Write `src/lib/constants.js`**

```js
export const SCALE = 52
export const CW = 17
export const CH = 11
export const WALL_HEIGHT = 2.5
export const GROUND_TEMP = 10

export const INS = {
  poor: { u: 1.8, ach: 0.9, label: 'Poor' },
  average: { u: 1.0, ach: 0.6, label: 'Average' },
  good: { u: 0.45, ach: 0.35, label: 'Good' },
}

export const SRC = {
  underfloor: { label: 'Underfloor', abbr: 'UF', min: 0.2, max: 3, def: 1.2 },
  radiator: { label: 'Radiator', abbr: 'RAD', min: 0.2, max: 3.5, def: 1.5 },
  electric: { label: 'Electric', abbr: 'EL', min: 0.2, max: 2.5, def: 1.0 },
  heatpump: { label: 'Heat pump', abbr: 'HP', min: 0.5, max: 5, def: 2.5 },
  stove: { label: 'Wood stove', abbr: 'ST', min: 1, max: 8, def: 4 },
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/constants.js
git commit -m "feat: add physics + UI constants"
```

---

### Task 3: Color module

**Files:**
- Create: `src/lib/color.js`
- Test: `src/lib/color.test.js`

**Interfaces:**
- Produces: `tempColor(t, alpha = 1, dark = false) -> string` (oklch), hue 245 (cold) → 25 (hot) over 10..28°C.

- [ ] **Step 1: Write the failing test `src/lib/color.test.js`**

```js
import { describe, expect, it } from 'vitest'
import { tempColor } from './color.js'

describe('tempColor', () => {
  it('is coldest hue at/below 10C', () => {
    expect(tempColor(10)).toBe('oklch(0.73 0.13 245 / 1)')
    expect(tempColor(5)).toBe('oklch(0.73 0.13 245 / 1)')
  })
  it('is hottest hue at/above 28C', () => {
    expect(tempColor(28)).toBe('oklch(0.73 0.13 25 / 1)')
    expect(tempColor(40)).toBe('oklch(0.73 0.13 25 / 1)')
  })
  it('applies alpha and dark lightness', () => {
    expect(tempColor(19, 0.42, true)).toBe('oklch(0.5 0.13 135 / 0.42)')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/color.test.js`
Expected: FAIL — cannot find module './color.js'.

- [ ] **Step 3: Write `src/lib/color.js`**

```js
export function tempColor(t, a = 1, dark = false) {
  const f = Math.min(1, Math.max(0, (t - 10) / 18))
  const hue = (245 - f * 220).toFixed(0)
  return 'oklch(' + (dark ? 0.5 : 0.73) + ' 0.13 ' + hue + ' / ' + a + ')'
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/color.test.js`
Expected: PASS (3 tests). Note: at t=19, f=0.5, hue=245-110=135.

- [ ] **Step 5: Commit**

```bash
git add src/lib/color.js src/lib/color.test.js
git commit -m "feat: add tempColor heatmap mapping"
```

---

### Task 4: Geometry module

`ov()` overlap and `wallsFor()` 3D wall-quad builder (with auto windows/doors). Verbatim from the prototype's `ov` and `wallsFor`, with `SCALE` imported.

**Files:**
- Create: `src/lib/geometry.js`
- Test: `src/lib/geometry.test.js`

**Interfaces:**
- Consumes: `SCALE` from `constants.js`.
- Produces:
  - `ov(a0, aw, b0, bw) -> number` (overlap length, clamped ≥ 0).
  - `wallsFor(rm, others) -> Array<{ left, top, width, height, origin, xform, bg, bc, openings: Array<{ l, t, w, h, bg, border }> }>` — 4 entries (n, s, w, e order). `rm`/`others` are `{ x, y, w, h }` in metres.

- [ ] **Step 1: Write the failing test `src/lib/geometry.test.js`**

```js
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/geometry.test.js`
Expected: FAIL — cannot find module './geometry.js'.

- [ ] **Step 3: Write `src/lib/geometry.js`** (verbatim port; `rm.windows` drives window count)

```js
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/geometry.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/geometry.js src/lib/geometry.test.js
git commit -m "feat: add overlap + 3D wall geometry"
```

---

### Task 5: Steady-state solver

Verbatim port of the prototype's `solve()`, as a pure function taking `floors` and `outsideTemp`.

**Files:**
- Create: `src/lib/solve.js`
- Test: `src/lib/solve.test.js`

**Interfaces:**
- Consumes: `INS`, `WALL_HEIGHT`, `GROUND_TEMP` from `constants.js`; `ov` from `geometry.js`.
- Produces: `solve(floors, outsideTemp) -> Map<roomId, { t: number, G: number }>`. `t` = steady-state °C, `G` = total room conductance (W/K).

- [ ] **Step 1: Write the failing test `src/lib/solve.test.js`**

Expected numbers derived from the linear steady state of an isolated 4×4 average room on floor 0: `Gout = extLen·H·u + infiltration + roof = 40·1.0 + 0.33·0.6·40 + 16·1.0·0.85 = 61.52`; `Ggnd = 16·0.4 = 6.4`; `T = (Q + Ggnd·10) / (Gout + Ggnd)` at `Tout = 0`.

```js
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/solve.test.js`
Expected: FAIL — cannot find module './solve.js'.

- [ ] **Step 3: Write `src/lib/solve.js`**

```js
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/solve.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/solve.js src/lib/solve.test.js
git commit -m "feat: add steady-state heat solver"
```

---

### Task 6: Default state + derive helpers

`defaultState()` seeds the house (verbatim data from the prototype, plus `showGrid`/`heatView`). `derive()` computes the aggregates the header/inspector need (summary counts, cold-room list, installed kW) from state + solved temps.

**Files:**
- Create: `src/lib/defaultState.js`
- Create: `src/lib/derive.js`
- Test: `src/lib/derive.test.js`

**Interfaces:**
- Produces:
  - `defaultState() -> { floors, activeFloor: 0, selected: null, outsideTemp: 0, comfort: 21, view: '3d', showGrid: true, heatView: 'heatmap' }`.
  - `derive(floors, temps, comfort) -> { okCount, total, allOk, coldRooms: Array<{ name, floorName, tempStr, needStr }>, totalKw }`.

- [ ] **Step 1: Write `src/lib/defaultState.js`**

```js
export function defaultState() {
  return {
    floors: [
      {
        id: 'g',
        name: 'Ground floor',
        rooms: [
          { id: 'r1', name: 'Living room', x: 1, y: 1, w: 6, h: 4.5, insulation: 'average', windows: 3, sources: [{ id: 's1', type: 'radiator', power: 2 }] },
          { id: 'r2', name: 'Kitchen', x: 7, y: 1, w: 4, h: 4.5, insulation: 'average', windows: 2, sources: [{ id: 's2', type: 'underfloor', power: 1.2 }] },
          { id: 'r3', name: 'Hall', x: 1, y: 5.5, w: 3, h: 3, insulation: 'average', windows: 1, sources: [] },
          { id: 'r4', name: 'Bathroom', x: 4, y: 5.5, w: 3, h: 3, insulation: 'average', windows: 1, sources: [{ id: 's3', type: 'electric', power: 0.8 }] },
          { id: 'r5', name: 'Office', x: 7, y: 5.5, w: 4, h: 3, insulation: 'average', windows: 2, sources: [{ id: 's4', type: 'radiator', power: 1 }] },
        ],
        stairs: [{ id: 'st1', x: 1.3, y: 5.9, w: 1, h: 2.4 }],
      },
      {
        id: 'u',
        name: 'Floor 1',
        rooms: [
          { id: 'r6', name: 'Bedroom 1', x: 1, y: 1, w: 5, h: 4, insulation: 'average', windows: 2, sources: [{ id: 's5', type: 'radiator', power: 1.2 }] },
          { id: 'r7', name: 'Bedroom 2', x: 6, y: 1, w: 5, h: 4, insulation: 'average', windows: 2, sources: [{ id: 's6', type: 'radiator', power: 1 }] },
          { id: 'r8', name: 'Bathroom', x: 4, y: 5, w: 3, h: 3, insulation: 'average', windows: 1, sources: [{ id: 's7', type: 'underfloor', power: 0.8 }] },
          { id: 'r9', name: 'Landing', x: 1, y: 5, w: 3, h: 3, insulation: 'average', windows: 0, sources: [] },
        ],
        stairs: [],
      },
    ],
    activeFloor: 0,
    selected: null,
    outsideTemp: 0,
    comfort: 21,
    view: '3d',
    showGrid: true,
    heatView: 'heatmap',
  }
}
```

- [ ] **Step 2: Write the failing test `src/lib/derive.test.js`**

```js
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
    expect(d.totalKw).toBeCloseTo(8.0, 1) // ground 2+1.2+0.8+1=5.0 + upper 1.2+1+0.8=3.0
    expect(typeof d.allOk).toBe('boolean')
    if (d.coldRooms.length) {
      expect(d.coldRooms[0].needStr.startsWith('+')).toBe(true)
      expect(d.coldRooms[0].tempStr.endsWith('°')).toBe(true)
    }
  })
})
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run src/lib/derive.test.js`
Expected: FAIL — cannot find module './derive.js'.

- [ ] **Step 4: Write `src/lib/derive.js`**

```js
export function derive(floors, temps, comfort) {
  const allRooms = []
  floors.forEach((f) => f.rooms.forEach((r) => allRooms.push({ r, f })))
  const okCount = allRooms.filter((x) => {
    const y = temps.get(x.r.id)
    return y && y.t >= comfort - 0.5
  }).length
  const total = allRooms.length
  const allOk = okCount === total && total > 0
  const coldRooms = allRooms
    .map((x) => ({ ...x, inf: temps.get(x.r.id) }))
    .filter((x) => x.inf && x.inf.t < comfort - 0.5)
    .map((x) => ({
      name: x.r.name,
      floorName: '· ' + x.f.name,
      tempStr: x.inf.t.toFixed(1) + '°',
      needStr: '+' + Math.max(0.1, ((comfort - x.inf.t) * x.inf.G) / 1000).toFixed(1) + ' kW',
    }))
  const totalKw = allRooms.reduce((s, x) => s + (x.r.sources || []).reduce((a, b) => a + b.power, 0), 0)
  return { okCount, total, allOk, coldRooms, totalKw }
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run src/lib/derive.test.js`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add src/lib/defaultState.js src/lib/derive.js src/lib/derive.test.js
git commit -m "feat: add default house state and derived aggregates"
```

---

### Task 7: Storage module

Load/save `heatsim-v1`, plus pure `serialize`/`parseImport` for export/import, and a `downloadJson` DOM helper.

**Files:**
- Create: `src/lib/storage.js`
- Test: `src/lib/storage.test.js`

**Interfaces:**
- Consumes: `defaultState` from `defaultState.js`.
- Produces:
  - `STORAGE_KEY` = `'heatsim-v1'`.
  - `load() -> state` (full, `selected: null`; falls back to `defaultState()`).
  - `save(state) -> void` (writes the persisted subset).
  - `serialize(state) -> string` (JSON of the persisted subset, pretty-printed).
  - `parseImport(text) -> state | null` (normalized full state, or null on invalid).
  - `downloadJson(filename, text) -> void`.

- [ ] **Step 1: Write the failing test `src/lib/storage.test.js`** (jsdom for localStorage)

Add `// @vitest-environment jsdom` at the top so `localStorage` exists.

```js
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/storage.test.js`
Expected: FAIL — cannot find module './storage.js'.

- [ ] **Step 3: Write `src/lib/storage.js`**

```js
import { defaultState } from './defaultState.js'

export const STORAGE_KEY = 'heatsim-v1'

function normalize(s) {
  if (!s || !Array.isArray(s.floors) || !s.floors.length) return null
  return {
    floors: s.floors.map((f) => ({ ...f, rooms: f.rooms || [], stairs: f.stairs || [] })),
    activeFloor: Math.min(s.activeFloor || 0, s.floors.length - 1),
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/storage.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage.js src/lib/storage.test.js
git commit -m "feat: add localStorage persistence + JSON export/import"
```

---

### Task 8: useHeatPlanner hook

Owns state, all mutation actions, drag/resize with the 3D inverse-projection, and debounced persistence.

**Files:**
- Create: `src/hooks/useHeatPlanner.js`

**Interfaces:**
- Consumes: `load`, `save` from `storage.js`; `defaultState`; `SCALE`, `CW`, `CH`, `SRC` from `constants.js`.
- Produces a hook returning `{ state, actions }` where `state` is the full state object and `actions` has: `setActiveFloor(i)`, `select(id)`, `deselect()`, `addFloor()`, `removeFloor(i)`, `addRoom()`, `updateRoom(id, patch)`, `deleteRoom(id)`, `addStairs()`, `updateStair(id, patch)`, `deleteStair(id)`, `setOutside(v)`, `setComfort(v)`, `setView(v)`, `toggleGrid()`, `setHeatView(v)`, `reset()`, `importState(next)`, `startDrag(e, item, mode, kind)`.

- [ ] **Step 1: Write `src/hooks/useHeatPlanner.js`**

```js
import { useCallback, useEffect, useRef, useState } from 'react'
import { load, save } from '../lib/storage.js'
import { defaultState } from '../lib/defaultState.js'
import { SCALE, CW, CH } from '../lib/constants.js'

const uid = () => Math.random().toString(36).slice(2, 9)
const ov = (a0, aw, b0, bw) => Math.max(0, Math.min(a0 + aw, b0 + bw) - Math.max(a0, b0))

export function useHeatPlanner() {
  const [state, setState] = useState(load)
  const dragRef = useRef(null)

  // debounced persistence
  useEffect(() => {
    const id = setTimeout(() => save(state), 300)
    return () => clearTimeout(id)
  }, [state])

  const updateRoom = useCallback((id, patch) => {
    setState((s) => ({
      ...s,
      floors: s.floors.map((f) => ({
        ...f,
        rooms: f.rooms.map((r) => (r.id === id ? { ...r, ...(typeof patch === 'function' ? patch(r) : patch) } : r)),
      })),
    }))
  }, [])

  const updateStair = useCallback((id, patch) => {
    setState((s) => ({
      ...s,
      floors: s.floors.map((f) => ({
        ...f,
        stairs: (f.stairs || []).map((t) => (t.id === id ? { ...t, ...patch } : t)),
      })),
    }))
  }, [])

  // drag handling via document listeners
  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current
      if (!d) return
      e.preventDefault()
      const q = (v) => Math.round(v * 4) / 4
      const pdx = e.clientX - d.sx
      const pdy = e.clientY - d.sy
      let dx, dy
      if (d.view !== '2d') {
        const K = 0.82
        const C = Math.SQRT1_2
        const CA = Math.cos((55 * Math.PI) / 180)
        const A = pdx / K / C
        const B = pdy / K / (C * CA)
        dx = (A - B) / 2 / SCALE
        dy = (A + B) / 2 / SCALE
      } else {
        dx = pdx / SCALE
        dy = pdy / SCALE
      }
      const upd = (p) => (d.kind === 'stair' ? updateStair(d.id, p) : updateRoom(d.id, p))
      const minSz = d.kind === 'stair' ? 0.7 : 1.5
      if (d.mode === 'move') {
        const nx = Math.min(Math.max(q(d.ox + dx), 0), CW - d.w)
        const ny = Math.min(Math.max(q(d.oy + dy), 0), CH - d.h)
        upd({ x: nx, y: ny })
      } else {
        const nw = Math.min(Math.max(q(d.ow + dx), minSz), CW - d.rx)
        const nh = Math.min(Math.max(q(d.oh + dy), minSz), CH - d.ry)
        upd({ w: nw, h: nh })
      }
    }
    const onUp = () => {
      dragRef.current = null
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [updateRoom, updateStair])

  const startDrag = useCallback((e, item, mode, kind) => {
    e.stopPropagation()
    e.preventDefault()
    setState((s) => ({ ...s, selected: item.id }))
    setState((s) => {
      dragRef.current = {
        mode,
        kind: kind || 'room',
        id: item.id,
        sx: e.clientX,
        sy: e.clientY,
        ox: item.x,
        oy: item.y,
        w: item.w,
        h: item.h,
        ow: item.w,
        oh: item.h,
        rx: item.x,
        ry: item.y,
        view: s.view,
      }
      return s
    })
  }, [])

  const actions = {
    setActiveFloor: (i) => setState((s) => ({ ...s, activeFloor: i, selected: null })),
    select: (id) => setState((s) => ({ ...s, selected: id })),
    deselect: () => setState((s) => ({ ...s, selected: null })),
    setOutside: (v) => setState((s) => ({ ...s, outsideTemp: v })),
    setComfort: (v) => setState((s) => ({ ...s, comfort: v })),
    setView: (v) => setState((s) => ({ ...s, view: v })),
    toggleGrid: () => setState((s) => ({ ...s, showGrid: !s.showGrid })),
    setHeatView: (v) => setState((s) => ({ ...s, heatView: v })),
    reset: () => setState(defaultState()),
    importState: (next) => setState({ ...next, selected: null }),
    updateRoom,
    updateStair,
    startDrag,
    addFloor: () =>
      setState((s) => ({
        ...s,
        floors: [...s.floors, { id: uid(), name: 'Floor ' + s.floors.length, rooms: [], stairs: [] }],
        activeFloor: s.floors.length,
        selected: null,
      })),
    removeFloor: (i) =>
      setState((s) => {
        if (s.floors.length <= 1) return s
        const floors = s.floors.filter((_, x) => x !== i)
        return { ...s, floors, activeFloor: Math.min(s.activeFloor, floors.length - 1), selected: null }
      }),
    addRoom: () =>
      setState((s) => {
        const fi = Math.min(s.activeFloor, s.floors.length - 1)
        const f = s.floors[fi]
        const w = 3, h = 3
        let px = 0.5, py = 0.5
        outer: for (let y = 0; y <= CH - h; y += 0.5)
          for (let x = 0; x <= CW - w; x += 0.5) {
            const clash = f.rooms.some((r) => ov(x, w, r.x, r.w) > 0.01 && ov(y, h, r.y, r.h) > 0.01)
            if (!clash) {
              px = x
              py = y
              break outer
            }
          }
        const room = { id: uid(), name: 'Room ' + (f.rooms.length + 1), x: px, y: py, w, h, insulation: 'average', windows: 1, sources: [] }
        return { ...s, floors: s.floors.map((fl, i) => (i === fi ? { ...fl, rooms: [...fl.rooms, room] } : fl)), selected: room.id }
      }),
    deleteRoom: (id) =>
      setState((s) => ({ ...s, selected: null, floors: s.floors.map((f) => ({ ...f, rooms: f.rooms.filter((r) => r.id !== id) })) })),
    addStairs: () =>
      setState((s) => {
        const fi = Math.min(s.activeFloor, s.floors.length - 1)
        const t = { id: uid(), x: 7, y: 4, w: 1, h: 2.5 }
        return { ...s, floors: s.floors.map((fl, i) => (i === fi ? { ...fl, stairs: [...(fl.stairs || []), t] } : fl)), selected: t.id }
      }),
    deleteStair: (id) =>
      setState((s) => ({ ...s, selected: null, floors: s.floors.map((f) => ({ ...f, stairs: (f.stairs || []).filter((t) => t.id !== id) })) })),
  }

  return { state, actions }
}
```

Note: heat-source add/remove is done through the generic `updateRoom` from the Inspector (which owns the `SRC` table), so the hook itself doesn't import `SRC`.

- [ ] **Step 2: Sanity build**

Run: `npx vite build`
Expected: build succeeds (hook not yet imported anywhere is fine).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useHeatPlanner.js
git commit -m "feat: add useHeatPlanner state hook with drag + persistence"
```

---

### Task 9: Footer component

Simplest component first to establish the JSX style. Static legend.

**Files:**
- Create: `src/components/Footer.jsx`

**Interfaces:**
- Produces: `<Footer />` (no props).

- [ ] **Step 1: Write `src/components/Footer.jsx`**

```jsx
export default function Footer() {
  return (
    <footer style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 20px', background: '#fff', borderTop: '1px solid #dde1e7', fontSize: 11, color: '#68758a' }}>
      <span style={{ fontWeight: 700, letterSpacing: '0.06em', fontSize: 10.5 }}>ROOM °C</span>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>10°</span>
      <div style={{ width: 220, height: 10, borderRadius: 5, background: 'linear-gradient(90deg, oklch(0.73 0.13 245), oklch(0.73 0.13 190) 28%, oklch(0.75 0.13 140) 47%, oklch(0.78 0.13 90) 63%, oklch(0.72 0.15 55) 82%, oklch(0.65 0.18 25))' }} />
      <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>28°+</span>
      <div style={{ width: 1, height: 16, background: '#e3e7ed' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ width: 14, height: 10, background: 'rgba(163,199,236,0.88)', border: '1.5px solid #64789a', borderRadius: 2 }} />
        <span>window</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ width: 10, height: 12, background: '#b98e5e', border: '1.5px solid #8f6a42', borderRadius: 2 }} />
        <span>door</span>
      </div>
      <div style={{ width: 1, height: 16, background: '#e3e7ed' }} />
      <span>Steady-state temperatures with heaters at set output — tune powers and outside temperature to test your setup.</span>
    </footer>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Footer.jsx
git commit -m "feat: add footer legend"
```

---

### Task 10: Room + Stairs components

**Files:**
- Create: `src/components/Room.jsx`
- Create: `src/components/Stairs.jsx`

**Interfaces:**
- Consumes: `SCALE`, `SRC` from `constants.js`; `tempColor` from `color.js`; `wallsFor` from `geometry.js`.
- Produces:
  - `<Room room temp comfort heatView is3 selected others onDown onResizeDown />` where `temp` is a number (°C), `others` is the sibling rooms array (for 3D walls).
  - `<Stairs stair is3 selected onDown onResizeDown />`.

- [ ] **Step 1: Write `src/components/Room.jsx`**

```jsx
import { SCALE, SRC } from '../lib/constants.js'
import { tempColor } from '../lib/color.js'
import { wallsFor } from '../lib/geometry.js'

export default function Room({ room, temp, comfort, heatView, is3, selected, others, onDown, onResizeDown }) {
  const t = temp
  const ok = t >= comfort - 0.5
  const near = t >= comfort - 2
  const hot = t > comfort + 3.5
  let fill, solid
  if (heatView === 'status') {
    solid = hot ? 'oklch(0.62 0.17 30)' : ok ? 'oklch(0.65 0.14 150)' : near ? 'oklch(0.72 0.13 80)' : 'oklch(0.62 0.12 250)'
    fill = solid.replace(')', ' / 0.4)')
  } else {
    fill = tempColor(t, 0.42)
    solid = tempColor(t, 0.95)
  }
  const S = SCALE
  const srcStr =
    room.sources && room.sources.length
      ? room.sources.map((s) => (SRC[s.type] || { abbr: '?' }).abbr + ' ' + s.power.toFixed(1)).join(' · ')
      : 'no heating'
  const walls = is3 ? wallsFor(room, others) : []
  const labelXform = is3 ? 'translateZ(26px) rotateZ(45deg) rotateX(-55deg)' : ''
  const labelBg = is3 ? 'rgba(255,255,255,0.65)' : 'transparent'

  return (
    <div
      onMouseDown={onDown}
      style={{
        position: 'absolute',
        left: room.x * S,
        top: room.y * S,
        width: room.w * S,
        height: room.h * S,
        background: fill,
        border: selected ? '2px solid #2b5fc7' : '1.5px solid ' + solid,
        boxShadow: selected ? '0 0 0 3px rgba(43,95,199,0.25)' : 'none',
        borderRadius: 4,
        cursor: 'move',
        userSelect: 'none',
        transformStyle: 'preserve-3d',
      }}
    >
      {walls.map((w, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: w.left,
            top: w.top,
            width: w.width,
            height: w.height,
            transformOrigin: w.origin,
            transform: w.xform,
            background: w.bg,
            border: '1px solid ' + w.bc,
            pointerEvents: 'none',
          }}
        >
          {w.openings.map((o, j) => (
            <div key={j} style={{ position: 'absolute', left: o.l, top: o.t, width: o.w, height: o.h, background: o.bg, border: o.border }} />
          ))}
        </div>
      ))}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%,-50%) ' + labelXform,
          background: labelBg,
          borderRadius: 5,
          padding: '2px 8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
          pointerEvents: 'none',
          maxWidth: '95%',
          overflow: 'hidden',
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 600, maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{room.name}</div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, fontWeight: 600 }}>{t.toFixed(1)}°</div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: '#3a4657', opacity: 0.85, maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{srcStr}</div>
      </div>
      {selected && (
        <div onMouseDown={onResizeDown} style={{ position: 'absolute', right: -1, bottom: -1, width: 14, height: 14, background: '#2b5fc7', borderRadius: '4px 0 3px 0', cursor: 'nwse-resize' }} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Write `src/components/Stairs.jsx`**

```jsx
import { SCALE } from '../lib/constants.js'

export default function Stairs({ stair, is3, selected, onDown, onResizeDown }) {
  const S = SCALE
  const vert = stair.h >= stair.w
  return (
    <div
      onMouseDown={onDown}
      style={{
        position: 'absolute',
        left: stair.x * S,
        top: stair.y * S,
        width: stair.w * S,
        height: stair.h * S,
        background: 'repeating-linear-gradient(' + (vert ? '180deg' : '90deg') + ', #cdd4de 0px, #cdd4de 5px, #f0f3f7 5px, #f0f3f7 13px)',
        border: selected ? '2px solid #2b5fc7' : '1.5px solid #9aa5b5',
        boxShadow: selected ? '0 0 0 3px rgba(43,95,199,0.25)' : 'none',
        borderRadius: 3,
        cursor: 'move',
        userSelect: 'none',
        transform: is3 ? 'translateZ(2px)' : 'none',
      }}
    >
      {selected && (
        <div onMouseDown={onResizeDown} style={{ position: 'absolute', right: -1, bottom: -1, width: 12, height: 12, background: '#2b5fc7', borderRadius: '3px 0 3px 0', cursor: 'nwse-resize' }} />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Sanity build**

Run: `npx vite build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/Room.jsx src/components/Stairs.jsx
git commit -m "feat: add Room and Stairs canvas elements"
```

---

### Task 11: Canvas component

**Files:**
- Create: `src/components/Canvas.jsx`

**Interfaces:**
- Consumes: `Room`, `Stairs`; the solved `temps` map; hook `actions`.
- Produces: `<Canvas floor view showGrid heatView comfort selected temps actions />` where `floor` is the active floor object.

- [ ] **Step 1: Write `src/components/Canvas.jsx`**

```jsx
import Room from './Room.jsx'
import Stairs from './Stairs.jsx'

export default function Canvas({ floor, view, showGrid, heatView, comfort, selected, temps, actions }) {
  const is3 = view !== '2d'
  const worldXform = is3 ? 'scale(0.82) rotateX(55deg) rotateZ(-45deg)' : 'none'
  const deselect = (e) => {
    if (e.target === e.currentTarget) actions.deselect()
  }
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 24, display: 'grid', placeItems: 'center' }} onMouseDown={deselect}>
      <div
        onMouseDown={deselect}
        style={{
          position: 'relative',
          width: 884,
          height: 572,
          flex: 'none',
          background: '#fbfcfe',
          border: '1px solid #d3d8e0',
          borderRadius: 8,
          boxShadow: '0 1px 3px rgba(20,30,50,0.06)',
          transform: worldXform,
          transformStyle: 'preserve-3d',
          transition: 'transform 0.6s ease',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            borderRadius: 8,
            opacity: showGrid ? 1 : 0,
            backgroundImage:
              'repeating-linear-gradient(0deg,#e8ecf1 0px,#e8ecf1 1px,transparent 1px,transparent 52px),repeating-linear-gradient(90deg,#e8ecf1 0px,#e8ecf1 1px,transparent 1px,transparent 52px)',
          }}
        />
        {floor.rooms.map((rm) => {
          const inf = temps.get(rm.id)
          return (
            <Room
              key={rm.id}
              room={rm}
              temp={inf ? inf.t : 0}
              comfort={comfort}
              heatView={heatView}
              is3={is3}
              selected={selected === rm.id}
              others={floor.rooms.filter((o) => o.id !== rm.id)}
              onDown={(e) => actions.startDrag(e, rm, 'move')}
              onResizeDown={(e) => actions.startDrag(e, rm, 'resize')}
            />
          )
        })}
        {(floor.stairs || []).map((t) => (
          <Stairs
            key={t.id}
            stair={t}
            is3={is3}
            selected={selected === t.id}
            onDown={(e) => actions.startDrag(e, t, 'move', 'stair')}
            onResizeDown={(e) => actions.startDrag(e, t, 'resize', 'stair')}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Sanity build**

Run: `npx vite build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/Canvas.jsx
git commit -m "feat: add Canvas with 2D/3D world transform"
```

---

### Task 12: Header component

**Files:**
- Create: `src/components/Header.jsx`

**Interfaces:**
- Consumes: hook `state` + `actions`; `derive` summary (`okCount`, `total`, `allOk`); `serialize`, `parseImport`, `downloadJson` from `storage.js`.
- Produces: `<Header state actions summary />` where `summary = { okCount, total, allOk }`.

- [ ] **Step 1: Write `src/components/Header.jsx`**

```jsx
import { useRef } from 'react'
import { serialize, parseImport, downloadJson } from '../lib/storage.js'

const btn = { padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }
const ghost = { ...btn, background: '#fff', border: '1px dashed #c3cad4', color: '#4a5568' }
const label = { fontSize: 10.5, color: '#68758a', fontWeight: 700, letterSpacing: '0.06em' }

export default function Header({ state, actions, summary }) {
  const fileRef = useRef(null)
  const fi = Math.min(state.activeFloor, state.floors.length - 1)
  const view = state.view === '2d' ? '2d' : '3d'
  const comfort = state.comfort
  const sumBg = summary.allOk ? 'oklch(0.93 0.05 150)' : 'oklch(0.93 0.06 70)'
  const sumColor = summary.allOk ? 'oklch(0.42 0.1 150)' : 'oklch(0.45 0.1 60)'

  const onImport = (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const next = parseImport(String(reader.result))
      if (next) actions.importState(next)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <header style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '10px 20px', background: '#fff', borderBottom: '1px solid #dde1e7', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>Home Heat Planner</div>
        <div style={{ fontSize: 11, color: '#68758a' }}>will your house stay warm?</div>
      </div>
      <div style={{ width: 1, height: 30, background: '#e3e7ed' }} />

      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {state.floors.map((f, i) => (
          <div
            key={f.id}
            onClick={() => actions.setActiveFloor(i)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 6, background: i === fi ? '#1b2330' : '#f1f3f6', color: i === fi ? '#fff' : '#3a4657', border: '1px solid ' + (i === fi ? '#1b2330' : '#dde1e7'), fontSize: 12.5, fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
          >
            <span>{f.name}</span>
            {state.floors.length > 1 && (
              <span onClick={(e) => { e.stopPropagation(); actions.removeFloor(i) }} style={{ opacity: 0.55, fontSize: 13, lineHeight: 1, cursor: 'pointer' }}>×</span>
            )}
          </div>
        ))}
        <button onClick={actions.addFloor} style={ghost}>+ Floor</button>
        <button onClick={actions.addRoom} style={{ ...btn, background: '#2b5fc7', border: '1px solid #2b5fc7', color: '#fff' }}>+ Room</button>
        <button onClick={actions.addStairs} style={ghost}>+ Stairs</button>
        <div style={{ display: 'flex', border: '1px solid #dde1e7', borderRadius: 6, overflow: 'hidden' }}>
          {['2d', '3d'].map((v) => (
            <button key={v} onClick={() => actions.setView(v)} style={{ padding: '6px 10px', border: 'none', background: view === v ? '#1b2330' : '#fff', color: view === v ? '#fff' : '#3a4657', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{v.toUpperCase()}</button>
          ))}
        </div>
        <button onClick={actions.toggleGrid} style={{ ...ghost, borderStyle: 'solid', borderColor: state.showGrid ? '#2b5fc7' : '#dde1e7', color: state.showGrid ? '#2b5fc7' : '#4a5568' }}>Grid</button>
        <div style={{ display: 'flex', border: '1px solid #dde1e7', borderRadius: 6, overflow: 'hidden' }}>
          {[['heatmap', 'Heat'], ['status', 'Status']].map(([v, lbl]) => (
            <button key={v} onClick={() => actions.setHeatView(v)} style={{ padding: '6px 10px', border: 'none', background: state.heatView === v ? '#1b2330' : '#fff', color: state.heatView === v ? '#fff' : '#3a4657', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{lbl}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={label}>OUTSIDE</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {[-10, 0, 10].map((v) => (
            <button key={v} onClick={() => actions.setOutside(v)} style={{ padding: '4px 8px', borderRadius: 5, background: state.outsideTemp === v ? '#e6edfb' : '#fff', border: '1px solid ' + (state.outsideTemp === v ? '#2b5fc7' : '#dde1e7'), color: state.outsideTemp === v ? '#2b5fc7' : '#4a5568', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, cursor: 'pointer' }}>{(v > 0 ? '+' : '') + v}°</button>
          ))}
        </div>
        <input type="range" min={-20} max={25} step={1} value={state.outsideTemp} onChange={(e) => actions.setOutside(parseInt(e.target.value, 10))} style={{ width: 120 }} />
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 600, minWidth: 44 }}>{(state.outsideTemp > 0 ? '+' : '') + state.outsideTemp}°C</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={label}>TARGET</span>
        <input type="range" min={16} max={25} step={0.5} value={comfort} onChange={(e) => actions.setComfort(parseFloat(e.target.value))} style={{ width: 80 }} />
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 600, minWidth: 38 }}>{(comfort % 1 === 0 ? comfort.toFixed(0) : comfort.toFixed(1)) + '°C'}</span>
      </div>

      <div style={{ padding: '6px 12px', borderRadius: 6, background: sumBg, color: sumColor, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 600 }}>
        {summary.okCount + '/' + summary.total + ' rooms warm'}
      </div>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button onClick={() => downloadJson('home-heat-plan.json', serialize(state))} style={ghost}>Export</button>
        <button onClick={() => fileRef.current && fileRef.current.click()} style={ghost}>Import</button>
        <button onClick={() => { if (window.confirm('Reset to the default house? Your current plan will be lost.')) actions.reset() }} style={{ ...ghost, borderColor: '#f0d4d4', color: '#c04747' }}>Reset</button>
        <input ref={fileRef} type="file" accept="application/json" onChange={onImport} style={{ display: 'none' }} />
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Sanity build**

Run: `npx vite build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/Header.jsx
git commit -m "feat: add Header with controls, toggles, export/import/reset"
```

---

### Task 13: Inspector component

Three mutually exclusive panels: room editor, stairs info, house overview.

**Files:**
- Create: `src/components/Inspector.jsx`

**Interfaces:**
- Consumes: `INS`, `SRC` from `constants.js`; `tempColor` from `color.js`; `ov` from `geometry.js`; hook `state` + `actions`; solved `temps`; `derive` output.
- Produces: `<Inspector state actions temps summary />` where `summary` is the full `derive()` result (`okCount, total, allOk, coldRooms, totalKw`).

- [ ] **Step 1: Write `src/components/Inspector.jsx`**

```jsx
import { INS, SRC } from '../lib/constants.js'
import { tempColor } from '../lib/color.js'
import { ov } from '../lib/geometry.js'

const label = { fontSize: 10.5, color: '#68758a', fontWeight: 700, letterSpacing: '0.06em' }
const uid = () => Math.random().toString(36).slice(2, 9)

export default function Inspector({ state, actions, temps, summary }) {
  const fi = Math.min(state.activeFloor, state.floors.length - 1)
  const floor = state.floors[fi] || { rooms: [], stairs: [] }
  const comfort = state.comfort
  const sel = floor.rooms.find((r) => r.id === state.selected) || null
  const stairSel = (floor.stairs || []).find((t) => t.id === state.selected) || null

  const aside = { width: 300, flex: 'none', background: '#fff', borderLeft: '1px solid #dde1e7', overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }

  if (sel) {
    const inf = temps.get(sel.id) || { t: state.outsideTemp, G: 1 }
    const t = inf.t
    const ok = t >= comfort - 0.5
    const hot = t > comfort + 3.5
    const need = Math.max(0.1, ((comfort - t) * inf.G) / 1000).toFixed(1)
    return (
      <aside style={aside}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <input value={sel.name} onChange={(e) => actions.updateRoom(sel.id, { name: e.target.value })} style={{ fontFamily: 'inherit', fontSize: 15, fontWeight: 700, border: 'none', borderBottom: '1px solid #dde1e7', padding: '4px 2px', outline: 'none', background: 'transparent', width: '100%', color: 'inherit' }} />
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#68758a' }}>{sel.w.toFixed(1) + ' × ' + sel.h.toFixed(1) + ' m · ' + (sel.w * sel.h).toFixed(1) + ' m²'}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '12px 14px', borderRadius: 8, background: '#f4f6f9', border: '1px solid #e3e7ed' }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 26, fontWeight: 600, color: tempColor(t, 1, true) }}>{t.toFixed(1)}°C</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: hot ? '#c04747' : ok ? '#3d7a55' : '#3f6fd0' }}>{hot ? 'Overheating — reduce power' : ok ? 'Comfortable' : 'Too cold — add ≈ ' + need + ' kW'}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={label}>INSULATION</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['poor', 'average', 'good'].map((k) => (
              <button key={k} onClick={() => actions.updateRoom(sel.id, { insulation: k })} style={{ flex: 1, padding: '7px 0', borderRadius: 6, background: sel.insulation === k ? '#1b2330' : '#fff', color: sel.insulation === k ? '#fff' : '#3a4657', border: '1px solid ' + (sel.insulation === k ? '#1b2330' : '#dde1e7'), fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{INS[k].label}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={label}>WINDOWS</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => actions.updateRoom(sel.id, (r) => ({ windows: Math.max(0, (r.windows || 0) - 1) }))} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #dde1e7', background: '#fff', fontSize: 14, cursor: 'pointer', color: '#3a4657' }}>−</button>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, fontWeight: 600, minWidth: 16, textAlign: 'center' }}>{sel.windows || 0}</span>
            <button onClick={() => actions.updateRoom(sel.id, (r) => ({ windows: Math.min(8, (r.windows || 0) + 1) }))} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #dde1e7', background: '#fff', fontSize: 14, cursor: 'pointer', color: '#3a4657' }}>+</button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={label}>HEAT SOURCES</div>
          {(sel.sources || []).length === 0 && <div style={{ fontSize: 12, color: '#98a2b3', padding: '8px 0' }}>No heat source yet — add one below.</div>}
          {(sel.sources || []).map((s) => {
            const m = SRC[s.type] || SRC.electric
            return (
              <div key={s.id} style={{ border: '1px solid #e3e7ed', borderRadius: 8, padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>{m.label}</span>
                  <span onClick={() => actions.updateRoom(sel.id, (r) => ({ sources: r.sources.filter((x) => x.id !== s.id) }))} style={{ cursor: 'pointer', color: '#98a2b3', fontSize: 15, lineHeight: 1 }}>×</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="range" min={m.min} max={m.max} step={0.1} value={s.power} onChange={(e) => { const v = parseFloat(e.target.value); actions.updateRoom(sel.id, (r) => ({ sources: r.sources.map((x) => (x.id === s.id ? { ...x, power: v } : x)) })) }} style={{ flex: 1 }} />
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, minWidth: 52, textAlign: 'right' }}>{s.power.toFixed(1)} kW</span>
                </div>
              </div>
            )
          })}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Object.keys(SRC).map((k) => (
              <button key={k} onClick={() => actions.updateRoom(sel.id, (r) => ({ sources: [...(r.sources || []), { id: uid(), type: k, power: SRC[k].def }] }))} style={{ padding: '5px 9px', borderRadius: 6, border: '1px dashed #c3cad4', background: '#fff', color: '#4a5568', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>+ {SRC[k].label}</button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => actions.deleteRoom(sel.id)} style={{ padding: '8px 0', borderRadius: 6, border: '1px solid #f0d4d4', background: '#fff', color: '#c04747', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Delete room</button>
      </aside>
    )
  }

  if (stairSel) {
    let stairInfo
    if (fi >= state.floors.length - 1) {
      stairInfo = 'There is no floor above this one, so these stairs don’t connect anywhere yet.'
    } else {
      const aboveNames = state.floors[fi + 1].rooms
        .filter((r) => ov(stairSel.x, stairSel.w, r.x, r.w) * ov(stairSel.y, stairSel.h, r.y, r.h) > 0.2)
        .map((r) => r.name)
      stairInfo = aboveNames.length
        ? 'Open stairwell — warm air rises into ' + aboveNames.join(', ') + ' on ' + state.floors[fi + 1].name + '.'
        : 'No room on ' + state.floors[fi + 1].name + ' overlaps these stairs, so no heat flows through them. Move a room above them to connect.'
    }
    return (
      <aside style={aside}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Staircase</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#68758a' }}>{stairSel.w.toFixed(1) + ' × ' + stairSel.h.toFixed(1) + ' m'}</div>
        </div>
        <div style={{ fontSize: 12.5, color: '#4a5568', lineHeight: 1.6, padding: '10px 12px', borderRadius: 8, background: '#f4f6f9', border: '1px solid #e3e7ed' }}>{stairInfo}</div>
        <div style={{ flex: 1 }} />
        <button onClick={() => actions.deleteStair(stairSel.id)} style={{ padding: '8px 0', borderRadius: 6, border: '1px solid #f0d4d4', background: '#fff', color: '#c04747', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Delete stairs</button>
      </aside>
    )
  }

  return (
    <aside style={aside}>
      <div style={{ fontSize: 14, fontWeight: 700 }}>House overview</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#68758a' }}>Rooms</span><span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{summary.total}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#68758a' }}>Installed heating</span><span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{summary.totalKw.toFixed(1)} kW</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#68758a' }}>Rooms at target</span><span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{summary.okCount + ' of ' + summary.total}</span></div>
      </div>
      {summary.coldRooms.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={label}>NEEDS MORE HEAT</div>
          {summary.coldRooms.map((c, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, fontSize: 12, padding: '6px 8px', borderRadius: 6, background: '#f4f6f9' }}>
              <span style={{ fontWeight: 600, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name} <span style={{ color: '#98a2b3', fontWeight: 400 }}>{c.floorName}</span></span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#3f6fd0' }}>{c.tempStr}</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#68758a' }}>{c.needStr}</span>
            </div>
          ))}
        </div>
      )}
      {summary.allOk && <div style={{ fontSize: 12.5, color: '#3d7a55', fontWeight: 600, padding: '8px 10px', borderRadius: 6, background: 'oklch(0.95 0.03 150)' }}>Every room reaches the target temperature.</div>}
      <div style={{ flex: 1 }} />
      <div style={{ fontSize: 11.5, color: '#98a2b3', lineHeight: 1.6 }}>Click a room to edit its insulation, windows and heat sources. Drag rooms to move them; drag the blue corner to resize. Rooms that share a wall exchange heat, and floors leak heat to the level above.</div>
    </aside>
  )
}
```

- [ ] **Step 2: Sanity build**

Run: `npx vite build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/Inspector.jsx
git commit -m "feat: add Inspector (room/stairs/overview panels)"
```

---

### Task 14: App composition

Wire the hook, solver, derive, and all components into the full-viewport layout.

**Files:**
- Modify: `src/App.jsx` (replace placeholder)

**Interfaces:**
- Consumes: `useHeatPlanner`; `solve`; `derive`; `Header`, `Canvas`, `Inspector`, `Footer`.

- [ ] **Step 1: Write `src/App.jsx`**

```jsx
import { useMemo } from 'react'
import { useHeatPlanner } from './hooks/useHeatPlanner.js'
import { solve } from './lib/solve.js'
import { derive } from './lib/derive.js'
import Header from './components/Header.jsx'
import Canvas from './components/Canvas.jsx'
import Inspector from './components/Inspector.jsx'
import Footer from './components/Footer.jsx'

export default function App() {
  const { state, actions } = useHeatPlanner()
  const temps = useMemo(() => solve(state.floors, state.outsideTemp), [state.floors, state.outsideTemp])
  const summary = useMemo(() => derive(state.floors, temps, state.comfort), [state.floors, temps, state.comfort])
  const fi = Math.min(state.activeFloor, state.floors.length - 1)
  const floor = state.floors[fi] || { rooms: [], stairs: [] }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'IBM Plex Sans', sans-serif", color: '#1b2330', background: '#edeff2', overflow: 'hidden' }}>
      <Header state={state} actions={actions} summary={{ okCount: summary.okCount, total: summary.total, allOk: summary.allOk }} />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <Canvas floor={floor} view={state.view} showGrid={state.showGrid} heatView={state.heatView} comfort={state.comfort} selected={state.selected} temps={temps} actions={actions} />
        <Inspector state={state} actions={actions} temps={temps} summary={summary} />
      </div>
      <Footer />
    </div>
  )
}
```

- [ ] **Step 2: Run the full test suite + build**

Run: `npm test && npx vite build`
Expected: all tests PASS, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "feat: compose full Home Heat Planner app"
```

---

### Task 15: Manual verification + README update

**Files:**
- Modify: `README.md` (add a short "Running the app" section)

- [ ] **Step 1: Run the dev server and drive the app**

Use the `run` skill (or `npm run dev`) and confirm in a browser:
- App loads the default house in 3D; grid visible; summary badge shows "N/9 rooms warm".
- Switch 2D/3D — the plan tilts with the 0.6s transition.
- Click a room — inspector shows temp card, insulation, windows, heat sources; edit each and watch temps/heatmap update.
- Drag a room in both 2D and 3D — it moves under the cursor and snaps to 0.25m; drag the blue corner to resize.
- Add/delete floor, room, stairs. Select stairs — info text matches overlap.
- Toggle Grid and Heat/Status — canvas responds.
- Change outside preset/slider and target slider — temps and badge update.
- Reload the page — state persists (localStorage `heatsim-v1`).
- Export downloads `home-heat-plan.json`; edit the house, Import the file, house restored; Reset returns to default after confirm.

- [ ] **Step 2: Add a "Running the app" section to `README.md`**

Append:

```markdown
## Running the app

```bash
npm install
npm run dev      # start the Vite dev server
npm test         # run the Vitest unit tests (solver, geometry, storage)
npm run build    # production build
```

State persists to `localStorage` under `heatsim-v1`. Use the header's
Export / Import buttons to move a plan as JSON, or Reset to restore the
default house.
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add running instructions"
```

---

## Self-Review

**Spec coverage:**
- Header / canvas+inspector / footer layout → Tasks 9–14. ✓
- Multi-floor editor, add/delete floor/room/stairs → hook (Task 8) + Header (Task 12). ✓
- 2D/3D views + world transform → Canvas (Task 11). ✓
- Drag/resize with 3D inverse projection → hook (Task 8), verified in Task 15. ✓
- Solver across floors → Task 5. ✓
- Inspector room/stairs/overview → Task 13. ✓
- Outside presets/slider, target slider, summary badge → Task 12. ✓
- Persistence `heatsim-v1` → Task 7 + hook. ✓
- Extras: grid + heatmap/status toggles (Task 12), reset + export/import (Tasks 7, 12). ✓
- Tests for solver + geometry + storage + derive → Tasks 3–7. ✓

**Placeholder scan:** No TODO/TBD; every code step shows full code. ✓

**Type consistency:** `solve() -> Map<id,{t,G}>` used consistently in App/Canvas/Inspector/derive. `actions` method names match between hook (Task 8) and consumers (Tasks 11–13). `derive()` shape (`okCount,total,allOk,coldRooms,totalKw`) matches Header `summary` subset and Inspector full use. `wallsFor` return shape matches Room's wall render. `tempColor(t,a,dark)` signature consistent. ✓
