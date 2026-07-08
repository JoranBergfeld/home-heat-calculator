# Home Heat Planner

An interactive app where a homeowner draws their home layout (multiple floors, rooms, stairs), assigns heat sources, and simulates steady-state room temperatures at different outside temperatures to find the right heating setup.

## About the design files

`Home Heat Planner.dc.html` (+ `support.js`, its runtime) is a **high-fidelity working prototype built in HTML/React**. Open the HTML file in a browser to run it. It is a design + behavior reference: recreate it in this repo's environment (a plain React/Vite app is a good fit — the prototype logic is already a single React class component), rather than shipping these files as-is.

## Fidelity

**High-fidelity.** Colors, typography, spacing, and all interactions are final-intent. The physics model is intentionally simplified but its constants and structure below are the spec.

## App layout

Single screen, full viewport, column flex:

1. **Header** (white, 1px bottom border `#dde1e7`, padding 10×20): app title + subtitle; floor tabs (active: `#1b2330` bg, white text; inactive `#f1f3f6`); `+ Floor` (dashed ghost), `+ Room` (primary `#2b5fc7`), `+ Stairs` (dashed ghost); 2D/3D segmented toggle; OUTSIDE temp presets (−10°/0°/+10°) + slider (−20…25 °C) + mono readout; TARGET temp slider (16…25, step 0.5); summary badge "N/M rooms warm" (green `oklch(0.93 0.05 150)` when all warm, amber otherwise).
2. **Main row**: canvas area (flex 1, centered) + inspector sidebar (300px, white, left border).
3. **Footer legend**: temperature gradient bar 10°→28°+, window/door swatches, explainer copy.

## Canvas

- Fixed plan: 17 m × 11 m at **52 px/m** (884×572 px), background `#fbfcfe`, 1 m grid lines `#e8ecf1` (toggleable), border `#d3d8e0`, radius 8.
- **2D mode**: top-down. **3D mode** (default): the same DOM tilted with CSS `scale(0.82) rotateX(55deg) rotateZ(-45deg)` (orthographic — no perspective), animated with `transition: transform 0.6s`.
- **Rooms**: absolutely positioned divs (position/size in meters × 52). Fill = temperature color at 42% alpha, border 1.5px solid of same hue; selected: 2px `#2b5fc7` border + `0 0 0 3px rgba(43,95,199,0.25)` ring.
- **3D walls**: each room renders 4 wall quads (2.5 m tall = 130 px), hinged on room edges via `transform-origin` + `rotateX(90deg)` (n/s) / `rotateY(-90deg)` (e/w), inset 1.5px to avoid z-fighting with neighbors. North/east walls opaque `#d9dee8`; south/west (camera-facing) transparent `rgba(206,213,224,0.22)` so interiors stay visible.
- **Windows**: room has a window *count*; panes (1.2 m wide, 0.9–2.1 m high, `rgba(163,199,236,0.88)` + `#64789a` frame) are auto-distributed across exterior (non-shared) wall segments.
- **Doors**: auto-drawn (0.9 m wide, 2.05 m high, `#b98e5e`/`#8f6a42`) centered on every wall segment shared between two adjacent rooms.
- **Stairs**: draggable/resizable striped element (`repeating-linear-gradient`, treads perpendicular to long axis, `#cdd4de`/`#f0f3f7`, border `#9aa5b5`).
- **Labels**: room name (12px/600), temp (IBM Plex Mono 14px/600), source summary (mono 9.5px, e.g. "RAD 2.0 · UF 1.2"). In 3D the label block is billboarded (`translateZ(26px) rotateZ(45deg) rotateX(-55deg)`) on a `rgba(255,255,255,0.65)` pill.

## Interactions

- Drag room/stair body to move; drag blue 14px corner handle to resize. Snap 0.25 m; min room 1.5 m, min stair 0.7 m; clamped to plan bounds.
- In 3D, screen deltas are inverse-projected to plan coords: `A = dx/k/c`, `B = dy/(k·c·cos55°)`, `du=(A−B)/2`, `dv=(A+B)/2` with `k=0.82`, `c=√½`.
- Click room/stair selects (inspector switches); click empty canvas deselects (house overview).
- Floor tabs switch floors; × on tab deletes floor (only when >1).

## Inspector (right sidebar)

- **Room selected**: editable name; dims line (`w × h m · area m²`); temp card (big mono °C, colored by temp; status: "Comfortable" / "Too cold — add ≈ X kW" / "Overheating — reduce power"); insulation segmented (Poor/Average/Good); windows stepper (0–8); heat source cards (label, remove ×, power slider with per-type min/max, mono kW readout); add-source buttons; Delete room.
- **Stairs selected**: dims, info pill ("Open stairwell — warm air rises into <rooms> on <floor>." / not-connected variants), Delete.
- **Nothing selected**: house overview (room count, installed kW, rooms at target), "NEEDS MORE HEAT" list (room, floor, temp, ≈kW deficit), all-warm confirmation, usage hints.

## Heat sources (kW range, default)

Underfloor UF 0.2–3 (1.2) · Radiator RAD 0.2–3.5 (1.5) · Electric EL 0.2–2.5 (1.0) · Heat pump HP 0.5–5 (2.5) · Wood stove ST 1–8 (4).

## Physics model (steady-state solver)

All rooms across all floors are solved together. Wall height 2.5 m; ground temp fixed 10 °C.

Per room, conductances (W/K):
- Exterior wall: `(ext wall area − window area) × U_ins` with `U_ins` = 1.8 / 1.0 / 0.45 (poor/average/good). Exterior length = perimeter − shared edge lengths.
- Windows: `count × 1.6 m² × 2.6` (capped at 80% of exterior wall area).
- Infiltration: `0.33 × ACH × volume`, ACH = 0.9 / 0.6 / 0.35.
- Roof (footprint not covered by a room above): `area × U_ins × 0.85` to outside.
- Ground floor slab: `area × 0.4` to 10 °C; upper-floor footprint with nothing below: `area × 0.6` to outside.
- Shared interior wall (adjacency = edges within 0.13 m, overlap > 0.3 m): `length × 2.5 × 2.0` between the two rooms.
- Floor/ceiling between overlapping rooms on adjacent floors: `overlap area × 1.5`.
- **Stairs**: for a stair footprint overlapping room A below and room B above: `min(overlapA, overlapB) × 12` between A and B (open stairwell).

Heat input per room = Σ source kW × 1000 (sources always at set output — no thermostat). Solve `T_i = (Q_i + Σ G_ij·T_j + G_out·T_out + G_gnd·10) / ΣG` by Gauss–Seidel, ~200 iterations. Deficit shown to user = `(T_target − T_i) × ΣG_i / 1000` kW.

## Temperature → color

`f = clamp((t−10)/18)`, hue = `245 − 220f`, color = `oklch(0.73 0.13 hue / alpha)` (0.5 lightness for text). Comfortable: `t ≥ target − 0.5`; overheating: `t > target + 3.5`. Alternative "status" view: green/amber/blue/red fills.

## State & persistence

Single state tree: `{ floors: [{id, name, rooms: [{id, name, x, y, w, h, insulation, windows, sources: [{id, type, power}]}], stairs: [{id, x, y, w, h}]}], activeFloor, selected, outsideTemp, comfort, view }`. Persisted to `localStorage` key `heatsim-v1` (debounced 300 ms); browser-only storage by design. Ships with a default two-floor sample home.

## Design tokens

- Fonts: **IBM Plex Sans** (UI), **IBM Plex Mono** (numbers/readouts) — Google Fonts.
- Text `#1b2330`, secondary `#68758a`, muted `#98a2b3`; page bg `#edeff2`; surfaces `#ffffff`/`#f4f6f9`; borders `#dde1e7`/`#e3e7ed`.
- Accent `#2b5fc7` (hover `#2451ab`); danger `#c04747`; success `#3d7a55`.
- Radii: 8 (cards/canvas), 6 (buttons/tabs), 4 (rooms). Section labels: 10.5px/700, letter-spacing 0.06em, uppercase.

## Files

- `Home Heat Planner.dc.html` — the entire prototype (markup template + `Component` logic class with solver, geometry, and interaction code).
- `support.js` — prototype runtime (loads the template + class; not part of the reimplementation).
