export const defaultSettings = {
  wattsPerCubicMeter: 40,
  windowLossPerSquareMeter: 25,
  doorLossPerSquareMeter: 15,
  floorHeatingWattsPerSquareMeter: 85,
  centralHeatingWattsPerUnit: 1500,
}

const toNumber = (value) => {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 0
  }

  return numericValue
}

const clampToZero = (value) => Math.max(0, toNumber(value))

export const calculateOpeningArea = (opening) => {
  const width = clampToZero(opening.width)
  const height = clampToZero(opening.height)
  const count = Math.max(1, Math.round(clampToZero(opening.count) || 1))

  return width * height * count
}

export const calculateHeatProduction = (room, settings) => {
  const floorArea = clampToZero(room.length) * clampToZero(room.width)
  const floorCoverage = Math.min(100, clampToZero(room.floorHeatingCoverage)) / 100
  const floorHeatingOutput =
    floorArea * floorCoverage * clampToZero(settings.floorHeatingWattsPerSquareMeter)
  const centralHeatingUnits = clampToZero(room.centralHeatingUnits)
  const centralHeatingOutput =
    centralHeatingUnits * clampToZero(settings.centralHeatingWattsPerUnit)

  return {
    floorHeatingOutput,
    centralHeatingOutput,
    totalHeatProduction: floorHeatingOutput + centralHeatingOutput,
  }
}

export const calculateRoomMetrics = (room, settings) => {
  const length = clampToZero(room.length)
  const width = clampToZero(room.width)
  const height = clampToZero(room.height)
  const volume = length * width * height
  const baseHeat = volume * clampToZero(settings.wattsPerCubicMeter)

  const openings = Array.isArray(room.openings) ? room.openings : []
  const windowArea = openings
    .filter((opening) => opening.type === 'window')
    .reduce((sum, opening) => sum + calculateOpeningArea(opening), 0)
  const doorArea = openings
    .filter((opening) => opening.type === 'door')
    .reduce((sum, opening) => sum + calculateOpeningArea(opening), 0)

  const windowHeatLoss = windowArea * clampToZero(settings.windowLossPerSquareMeter)
  const doorHeatLoss = doorArea * clampToZero(settings.doorLossPerSquareMeter)
  const requiredHeat = baseHeat + windowHeatLoss + doorHeatLoss
  const production = calculateHeatProduction(room, settings)

  return {
    floorArea: length * width,
    volume,
    baseHeat,
    windowArea,
    doorArea,
    windowHeatLoss,
    doorHeatLoss,
    requiredHeat,
    ...production,
    heatBalance: production.totalHeatProduction - requiredHeat,
  }
}

export const calculateSetupMetrics = (setup, settings) => {
  const rooms = Array.isArray(setup.rooms) ? setup.rooms : []
  const roomMetrics = rooms.map((room) => ({
    room,
    metrics: calculateRoomMetrics(room, settings),
  }))

  return roomMetrics.reduce(
    (totals, entry) => ({
      roomMetrics,
      totalRequiredHeat: totals.totalRequiredHeat + entry.metrics.requiredHeat,
      totalHeatProduction: totals.totalHeatProduction + entry.metrics.totalHeatProduction,
      totalVolume: totals.totalVolume + entry.metrics.volume,
      totalFloorArea: totals.totalFloorArea + entry.metrics.floorArea,
    }),
    {
      roomMetrics,
      totalRequiredHeat: 0,
      totalHeatProduction: 0,
      totalVolume: 0,
      totalFloorArea: 0,
    },
  )
}
