import { describe, expect, it } from 'vitest'
import { getExpandedFlexGrow } from '../../../src/components/navigation/bottomNavLayout'

describe('getExpandedFlexGrow', () => {
  it('makes one of three items exactly 10% wider on hover', () => {
    const targetWeight = getExpandedFlexGrow(3, 1.1)
    const targetShare = targetWeight / (targetWeight + 2)

    expect(targetShare).toBeCloseTo(1.1 / 3)
  })

  it('makes one of three items exactly 20% wider when pressed', () => {
    const targetWeight = getExpandedFlexGrow(3, 1.2)
    const targetShare = targetWeight / (targetWeight + 2)

    expect(targetShare).toBeCloseTo(1.2 / 3)
  })

  it('does not expand a row with no siblings to squish', () => {
    expect(getExpandedFlexGrow(1, 1.2)).toBe(1)
  })

  it('rejects multipliers that cannot fit within the row', () => {
    expect(getExpandedFlexGrow(3, 3)).toBe(1)
  })
})
