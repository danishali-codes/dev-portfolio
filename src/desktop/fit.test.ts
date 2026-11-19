import { describe, expect, it } from 'vitest'
import { firstOverflow, iconColumns } from './fit'

describe('iconColumns', () => {
  it('keeps two columns when every row fits', () => {
    expect(iconColumns(12, 1000, 97, 18)).toBe(2)
  })
  it('adds columns when the rows would run under the taskbar', () => {
    // 574px of room fits 5 rows of 97px with 18px gaps, so 12 icons need 3 columns
    expect(iconColumns(12, 574, 97, 18)).toBe(3)
    expect(iconColumns(12, 390, 97, 18)).toBe(4)
  })
  it('never drops below one row', () => {
    expect(iconColumns(12, 20, 97, 18)).toBe(12)
  })
})

describe('firstOverflow', () => {
  it('finds the first note that hangs past the bottom', () => {
    const boxes = [
      { top: 0, height: 280 },
      { top: 296, height: 100 },
      { top: 412, height: 100 },
    ]
    expect(firstOverflow(boxes, 600)).toBe(3)
    expect(firstOverflow(boxes, 450)).toBe(2)
    expect(firstOverflow(boxes, 200)).toBe(0)
  })
})
