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
