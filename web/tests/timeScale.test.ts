import { describe, it, expect } from 'vitest'
import { makeScale } from '../src/lib/timeScale'

describe('makeScale', () => {
  it('round trip: tFor(xFor(t)) === t', () => {
    const scale = makeScale(20, 800, 140)
    for (let t = 0; t <= 20; t++) {
      const x = scale.xFor(t)
      const tBack = scale.tFor(x)
      expect(tBack).toBe(t)
    }
  })

  it('clamps tFor at lower bound', () => {
    const scale = makeScale(20, 800, 140)
    const tNeg = scale.tFor(scale.xFor(0) - 100)
    expect(tNeg).toBe(0)
  })

  it('handles total = 0', () => {
    const scale = makeScale(0, 800, 140)
    expect(scale.ppt).toBeGreaterThanOrEqual(14)
    expect(scale.xFor(0)).toBe(140)
    expect(scale.tFor(140)).toBe(0)
  })

  it('respects ppt bounds (14..48)', () => {
    // Very large total should clamp to min 14
    const scaleMin = makeScale(1000, 800, 100)
    expect(scaleMin.ppt).toBe(14)

    // Small total with large container should clamp to max 48
    const scaleMax = makeScale(2, 10000, 100)
    expect(scaleMax.ppt).toBe(48)
  })

  it('xFor increases with time', () => {
    const scale = makeScale(10, 600, 100)
    expect(scale.xFor(5)).toBeGreaterThan(scale.xFor(0))
    expect(scale.xFor(10)).toBeGreaterThan(scale.xFor(5))
  })

  it('widthFor calculates duration correctly', () => {
    const scale = makeScale(10, 600, 100)
    const w = scale.widthFor(3)
    expect(w).toBe(3 * scale.ppt)
  })

  it('totalWidth includes label and timeline', () => {
    const scale = makeScale(10, 600, 140)
    // 140 label + (10 + 2 padding) * ppt
    expect(scale.totalWidth).toBe(140 + 12 * scale.ppt)
  })
})
