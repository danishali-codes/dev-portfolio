import changelog from '../generated/changelog.json'
import { allProjects } from '../fs'

/** Opens the calendar that lives behind the taskbar clock. */
export function openCalendar() {
  window.dispatchEvent(new Event('folioos:calendar'))
}

export interface CalEvent {
  /** YYYY-MM-DD in local time */
  day: string
  label: string
  kind: 'jam' | 'update'
  path?: string
  color?: string
}

export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Game jams that ended on a known day, and every site update from the changelog. */
export function calendarEvents(): CalEvent[] {
  const jams: CalEvent[] = allProjects()
    .filter((p) => p.meta?.jamEnded)
    .map((p) => ({ day: p.meta!.jamEnded!, label: `${p.meta!.name} · ${p.meta!.jam ?? 'game jam'}`, kind: 'jam', path: p.path, color: p.meta!.color }))
  const updates: CalEvent[] = (changelog.entries as { title: string; date: string }[]).map((e) => ({
    day: dayKey(new Date(e.date)),
    label: e.title,
    kind: 'update',
  }))
  return [...jams, ...updates]
}

/** The weeks of a month, Monday first, with null for days outside it. */
export function monthGrid(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1)
  const lead = (first.getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => new Date(year, month, i + 1))]
  while (cells.length % 7) cells.push(null)
  const weeks: (Date | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

/** Projects by year, newest first, for the timeline under the month. */
export function timeline() {
  const byYear = new Map<number, { name: string; path: string; color?: string; jam?: string }[]>()
  for (const p of allProjects()) {
    const y = p.meta?.year
    if (!y) continue
    // Collections (Games, University, a subject) are folders of projects, not projects.
    if (p.children.some((c) => c.type === 'dir' && c.meta)) continue
    byYear.set(y, [...(byYear.get(y) ?? []), { name: p.meta!.name, path: p.path, color: p.meta!.color, jam: p.meta!.jam }])
  }
  return [...byYear.entries()].sort((a, b) => b[0] - a[0])
}
