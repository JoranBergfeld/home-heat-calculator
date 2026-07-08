export const SCALE = 52
export const CW = 17
export const CH = 11
export const WALL_HEIGHT = 2.5
export const GROUND_TEMP = 10

export const INS = {
  poor: { u: 1.8, ach: 0.9, label: 'Poor' },
  average: { u: 1.0, ach: 0.6, label: 'Average' },
  good: { u: 0.45, ach: 0.35, label: 'Good' },
}

export const SRC = {
  underfloor: { label: 'Underfloor', abbr: 'UF', min: 0.2, max: 3, def: 1.2 },
  radiator: { label: 'Radiator', abbr: 'RAD', min: 0.2, max: 3.5, def: 1.5 },
  electric: { label: 'Electric', abbr: 'EL', min: 0.2, max: 2.5, def: 1.0 },
  heatpump: { label: 'Heat pump', abbr: 'HP', min: 0.5, max: 5, def: 2.5 },
  stove: { label: 'Wood stove', abbr: 'ST', min: 1, max: 8, def: 4 },
}
