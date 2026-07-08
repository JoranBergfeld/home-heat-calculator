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
