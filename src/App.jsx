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
