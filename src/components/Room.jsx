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
