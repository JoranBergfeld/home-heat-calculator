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
