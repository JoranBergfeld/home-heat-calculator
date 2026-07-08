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
      stairInfo = 'There is no floor above this one, so these stairs don't connect anywhere yet.'
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
