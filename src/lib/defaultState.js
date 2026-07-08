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
