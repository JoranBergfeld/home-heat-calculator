import { describe, expect, it } from 'vitest'
import { tempColor } from './color.js'

describe('tempColor', () => {
  it('is coldest hue at/below 10C', () => {
    expect(tempColor(10)).toBe('oklch(0.73 0.13 245 / 1)')
    expect(tempColor(5)).toBe('oklch(0.73 0.13 245 / 1)')
  })
  it('is hottest hue at/above 28C', () => {
    expect(tempColor(28)).toBe('oklch(0.73 0.13 25 / 1)')
    expect(tempColor(40)).toBe('oklch(0.73 0.13 25 / 1)')
  })
  it('applies alpha and dark lightness', () => {
    expect(tempColor(19, 0.42, true)).toBe('oklch(0.5 0.13 135 / 0.42)')
  })
})
