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
