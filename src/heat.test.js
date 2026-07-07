import { describe, expect, it } from 'vitest'

import {
  calculateHeatProduction,
  calculateOpeningArea,
  calculateRoomMetrics,
  calculateSetupMetrics,
  defaultSettings,
} from './heat.js'

describe('heat calculations', () => {
  it('calculates opening area with count', () => {
    expect(calculateOpeningArea({ width: 1.2, height: 1.5, count: 2 })).toBeCloseTo(3.6)
  })

  it('calculates room heat requirement and production', () => {
    const metrics = calculateRoomMetrics(
      {
        length: 5,
        width: 4,
        height: 2.5,
        floorHeatingCoverage: 50,
        centralHeatingUnits: 1,
        openings: [
          { type: 'window', width: 2, height: 1.5, count: 2 },
          { type: 'door', width: 0.9, height: 2, count: 1 },
        ],
      },
      defaultSettings,
    )

    expect(metrics.volume).toBe(50)
    expect(metrics.requiredHeat).toBe(2177)
    expect(metrics.floorHeatingOutput).toBe(850)
    expect(metrics.centralHeatingOutput).toBe(1500)
    expect(metrics.totalHeatProduction).toBe(2350)
    expect(metrics.heatBalance).toBe(173)
  })

  it('aggregates setup totals across rooms', () => {
    const totals = calculateSetupMetrics(
      {
        rooms: [
          {
            length: 4,
            width: 4,
            height: 2.5,
            floorHeatingCoverage: 100,
            centralHeatingUnits: 0,
            openings: [],
          },
          {
            length: 3,
            width: 2,
            height: 2.5,
            floorHeatingCoverage: 0,
            centralHeatingUnits: 1,
            openings: [{ type: 'window', width: 1, height: 1.2, count: 1 }],
          },
        ],
      },
      defaultSettings,
    )

    expect(totals.totalVolume).toBe(55)
    expect(totals.totalRequiredHeat).toBe(2230)
    expect(totals.totalHeatProduction).toBe(2860)
    expect(totals.roomMetrics).toHaveLength(2)
  })

  it('clamps invalid values to safe numbers', () => {
    const production = calculateHeatProduction(
      {
        length: -5,
        width: 4,
        floorHeatingCoverage: 140,
        centralHeatingUnits: '2',
      },
      defaultSettings,
    )

    expect(production.floorHeatingOutput).toBe(0)
    expect(production.centralHeatingOutput).toBe(3000)
  })
})
