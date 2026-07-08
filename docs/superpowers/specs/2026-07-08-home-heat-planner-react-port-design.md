# Home Heat Planner — React Port Design

Date: 2026-07-08

## Goal

Turn the Claude Design prototype (`Home Heat Planner.dc.html` + `support.js`) into a
real React/Vite app. The prototype is a single class component running on Claude
Design's `DCLogic` runtime with `sc-for`/`sc-if` templating. We port it to idiomatic
React (functional components + hooks), keep everything in `localStorage` for now, and
add a few small quality-of-life extras.

The prototype is high fidelity: colors, spacing, typography, and interactions are
final-intent, and the physics constants are the spec. We match them exactly. The
`README.md` in the repo root is the authoritative behaviour spec and stays the
reference for anything not spelled out here.

## Scope

In scope (faithful port of the prototype):

- Full-viewport single screen: header, canvas + inspector, footer legend.
- Multi-floor floor-plan editor. Add/delete floors, rooms, stairs.
- 2D top-down and 3D tilted (CSS `rotateX(55deg) rotateZ(-45deg)` orthographic) views.
- Drag to move, corner-handle to resize rooms and stairs, with 3D inverse-projection.
- Steady-state heat solver across all floors; per-room temperature heatmap.
- Inspector: room editor (name, insulation, windows, heat sources), stairs info,
  and house overview with a "needs more heat" list.
- Outside-temp presets + slider, target-temp slider, "N/M rooms warm" summary.
- Persistence to `localStorage['heatsim-v1']` (same key and shape as the prototype).

Extras (agreed additions):

- UI toggles for the grid (on/off) and the color mode (heatmap / status), which are
  editor-only props in the prototype. Both persist.
- Reset to the default house.
- Export the current plan to a downloaded `.json`, and import one back.

Out of scope (for now):

- Any backend or cloud sync. localStorage only.
- Multiple named saved houses / a house switcher.
- Mobile / touch drag. Desktop mouse only, same as the prototype.
- Changing the physics model or any constant.

## Architecture

Approach B from brainstorming: pull the pure algorithms into standalone modules,
wrap state in a hook, and keep components presentational.

```
src/
  main.jsx              # React root (createRoot)
  App.jsx               # composes useHeatPlanner + layout, runs solve() per render
  index.css             # globals: font imports, body bg, range accent-color
  lib/
    constants.js        # SCALE=52, CW=17, CH=11, INS table, SRC table
    solve.js            # solve(floors, outsideTemp) -> Map<id,{t,G}>  (pure)
    geometry.js         # ov(), wallsFor(rm, others), adjacency helpers (pure)
    color.js            # tempColor(t, alpha, dark)
    defaultState.js     # defaultState() — the seed house
    storage.js          # load(), save(state), exportJson(state), importJson(file)
  hooks/
    useHeatPlanner.js   # owns state, update actions, drag/resize, debounced persist
  components/
    Header.jsx
    Canvas.jsx
    Room.jsx
    Stairs.jsx
    Inspector.jsx
    Footer.jsx
```

### Pure modules

- `constants.js` — `SCALE = 52`, `CW = 17`, `CH = 11`, plus the `INS`
  (poor/average/good → u, ach, label) and `SRC` (underfloor/radiator/electric/
  heatpump/stove → label, abbr, min, max, def) tables, copied verbatim from the
  prototype.
- `solve.js` — `solve(floors, outsideTemp) → Map<roomId, {t, G}>`. Straight extraction
  of the prototype's `solve()`. Builds conductance pairs (shared interior walls
  `len × H × 2.0`; inter-floor overlap `area × 1.5`; stair stacks `min(a,b) × 12`),
  per-room loss to outside (exterior wall minus windows × U, windows × 2.6,
  infiltration `0.33 × ach × vol`, roof `× U × 0.85`) and to ground (`area × 0.4` at
  10 °C on floor 0, else upper-floor `area × 0.6` to outside). Runs 200 Gauss-Seidel
  sweeps seeded at `max(Tout, 12)`. `t` = steady-state temp, `G` = total room
  conductance (the inspector uses it to size the `+X kW` deficit). Wall height `H = 2.5`.
- `geometry.js` — `ov(a0, aw, b0, bw)` overlap length; `wallsFor(rm, others)` builds
  the four 3D wall quads with auto-distributed windows (on exterior free segments
  ≥ 1.4 m, panes 1.2 m wide) and doors (centered on shared segments ≥ 0.95 m).
  Verbatim from the prototype.
- `color.js` — `tempColor(t, alpha, dark)`: maps 10→28 °C onto oklch hue 245→25.

### State hook

`useHeatPlanner()` owns one state object:

```
{ floors, activeFloor, selected, outsideTemp, comfort, view,
  showGrid, heatView }
```

`floors` is `[{ id, name, rooms: [...], stairs: [...] }]`; a room is
`{ id, name, x, y, w, h, insulation, windows, sources: [{id, type, power}] }`;
a stair is `{ id, x, y, w, h }`. `showGrid` (bool, default true) and `heatView`
('heatmap' | 'status', default 'heatmap') are new fields promoted from prototype props.

The hook exposes state plus actions: `setActiveFloor`, `select`, `deselect`,
`addFloor`, `removeFloor`, `addRoom`, `updateRoom`, `deleteRoom`, `addStairs`,
`updateStair`, `deleteStair`, `setOutside`, `setComfort`, `setView`, `toggleGrid`,
`setHeatView`, `reset`, `importState`, and drag starters `startDrag(e, item, mode,
kind)`. It registers document `mousemove`/`mouseup` listeners in a `useEffect` and
holds the in-flight drag in a ref (not state) so moves don't thrash renders; each
move calls `updateRoom`/`updateStair`. On every state change a debounced (300 ms)
effect writes to localStorage.

Update helpers mirror the prototype's immutable `map` patterns. `updateRoom(id,
patch)` accepts an object or a function `(room) => patch`.

### Components

- `App.jsx` — calls the hook, computes `const temps = useMemo(() => solve(floors,
  outsideTemp), [floors, outsideTemp])`, and lays out header / (canvas + inspector) /
  footer. Passes `temps`, state slices, and actions down as props.
- `Header.jsx` — title + subtitle, floor tabs (active `#1b2330`), add Floor/Room/
  Stairs buttons, 2D/3D segmented toggle, grid toggle, heatmap/status toggle, OUTSIDE
  presets + slider + mono readout, TARGET slider + readout, the summary badge, and the
  reset / export / import controls.
- `Canvas.jsx` — the 884×572 plan div with the world transform (`scale(0.82)
  rotateX(55deg) rotateZ(-45deg)` in 3D), the grid overlay (opacity from `showGrid`),
  and `onMouseDown` deselect. Renders `Room` and `Stairs` children for the active floor.
- `Room.jsx` — absolutely positioned room div; in 3D renders the four wall quads from
  `wallsFor`; billboarded label pill (name / mono temp / source summary); resize handle
  when selected. Fill/border come from `tempColor` (heatmap) or status buckets.
- `Stairs.jsx` — striped `repeating-linear-gradient` element with resize handle.
- `Inspector.jsx` — three mutually exclusive panels driven by selection: room editor,
  stairs info, or house overview (rooms / installed kW / rooms-at-target, the NEEDS
  MORE HEAT list, all-warm confirmation, usage hint).
- `Footer.jsx` — the temperature gradient legend, window/door swatches, explainer copy.

## Drag / resize math

Global `mousemove` reads the drag ref `{ mode, kind, id, sx, sy, ox, oy, ow, oh, rx,
ry }`. Pixel delta `(pdx, pdy) = (clientX - sx, clientY - sy)`.

- 2D: `dx = pdx / 52`, `dy = pdy / 52`.
- 3D: `K = 0.82`, `C = Math.SQRT1_2`, `CA = cos(55°)`;
  `A = pdx/K/C`, `B = pdy/K/(C·CA)`; `dx = (A−B)/2/52`, `dy = (A+B)/2/52`.

Snap to 0.25 m (`Math.round(v*4)/4`). Move clamps to `[0, CW−w] × [0, CH−h]`. Resize
clamps to `[minSz, CW−rx] × [minSz, CH−ry]` with `minSz` = 1.5 (room) / 0.7 (stair).

## Persistence & extras

- `storage.load()` reads `heatsim-v1`, validates `floors` is a non-empty array, and
  normalizes (`rooms`/`stairs` default to `[]`, numeric guards on outsideTemp/comfort,
  view in {2d,3d}). Adds `showGrid`/`heatView` with defaults if absent. On any failure
  returns `defaultState()`. Same forgiving behaviour as the prototype's `loadInitial`.
- `storage.save(state)` writes `{ floors, activeFloor, outsideTemp, comfort, view,
  showGrid, heatView }`.
- Export: serialize the persisted shape, trigger a download of
  `home-heat-plan.json` via a Blob + object URL.
- Import: read a `File`, `JSON.parse`, validate a `floors` array, then `importState`
  it into the hook (bad input is ignored with no crash).
- Reset: `importState(defaultState())` after a confirm.

## Testing

- `solve.test.js` — the physics is the riskiest logic. Cover: a single well-heated
  room reaches comfort; an unheated room sits near outside temp; adding heat raises
  temp monotonically; two adjacent rooms exchange heat (a hot room warms a cold
  neighbour vs. the same room isolated); ground floor pinned toward 10 °C ground vs an
  upper floor; the returned `G` sizes a sensible deficit. Assert against the
  prototype's own numbers where practical (run the prototype's `solve` mentally / via a
  captured fixture) rather than hand-waving.
- `geometry.test.js` — `ov()` overlap cases (touching, nested, disjoint); `wallsFor`
  produces 4 walls, puts a door on a shared segment, and distributes N windows onto
  exterior free segments without exceeding capacity.
- Drag math and the 3D visual transform are verified by running the app (the `run` /
  `verify` skills), not unit tests — they're about pixels and feel.

## Tech stack

Reuse the existing committed config: Vite 8 + `@vitejs/plugin-react`, React 19,
Vitest 4. `package.json` scripts: `dev`, `build`, `test`. The old form-based
`heat.js` / `main.jsx` / `storage.js` / `style.css` and their test are replaced
wholesale — the new prototype is a different app with a different physics model, so
none of that code carries over.

## Risks / notes

- The 3D CSS transform stack (`preserve-3d`, per-wall `transform-origin` + rotate,
  z-fighting insets, billboarded labels) is finicky; getting it pixel-faithful is the
  main effort. Copy the exact transforms from the prototype.
- The solver's 200-iteration relaxation is O(n²) in room count per sweep; fine for
  realistic house sizes (tens of rooms). No optimization needed.
- IDs use `Math.random().toString(36)` like the prototype. (Note: `Math.random` is
  fine in app runtime; it's only unavailable inside workflow scripts.)
