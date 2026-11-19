import { describe, expect, it } from 'vitest'
import { calendarEvents, dayKey, monthGrid, timeline } from './calendar'

describe('calendar', () => {
  it('lays a month out in Monday-first weeks', () => {
    // November 2026 starts on a Sunday.
    const weeks = monthGrid(2026, 10)
    expect(weeks[0].slice(0, 6)).toEqual([null, null, null, null, null, null])
    expect(weeks[0][6]?.getDate()).toBe(1)
    expect(weeks.flat().filter(Boolean)).toHaveLength(30)
    expect(weeks.every((w) => w.length === 7)).toBe(true)
  })

  it('formats day keys in local time', () => {
    expect(dayKey(new Date(2025, 7, 3))).toBe('2025-08-03')
  })

  it('marks the game jams on the days they ended', () => {
    const jams = calendarEvents().filter((e) => e.kind === 'jam')
    expect(jams.map((j) => j.day).sort()).toEqual(['2025-08-03', '2025-08-31', '2026-08-17'])
  })

  it('lists projects by year, newest first, without collections', () => {
    const years = timeline()
    expect(years[0][0]).toBeGreaterThan(years[years.length - 1][0])
    const names = years.flatMap(([, l]) => l.map((p) => p.name))
    expect(names).toContain('Fuloos')
    expect(names).not.toContain('Games')
  })
})
