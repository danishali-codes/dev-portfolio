import { useEffect, useMemo, useRef, useState } from 'react'
import { t } from '../text'
import { getNode } from '../fs'
import { openNode, openUpdates } from '../shell/opener'
import { calendarEvents, dayKey, monthGrid, timeline, type CalEvent } from './calendar'

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

/** A month view and a timeline of projects, opened from the taskbar clock. */
export default function Calendar({ onClose }: { onClose: () => void }) {
  const today = new Date()
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() })
  const [picked, setPicked] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const events = useMemo(calendarEvents, [])
  const byDay = useMemo(() => {
    const m = new Map<string, CalEvent[]>()
    for (const e of events) m.set(e.day, [...(m.get(e.day) ?? []), e])
    return m
  }, [events])
  const years = useMemo(timeline, [])

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLElement>('.cal-today, .cal-nav button')?.focus()
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node) && !(e.target as HTMLElement).closest('.tb-clock')) onClose()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
      if (!document.activeElement || document.activeElement === document.body) opener?.focus()
    }
  }, [onClose])

  const shift = (n: number) => {
    setPicked(null)
    setView((v) => {
      const d = new Date(v.y, v.m + n, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })
  }
  const title = new Date(view.y, view.m, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const todayKey = dayKey(today)
  const shown = picked ? byDay.get(picked) ?? [] : []
  const open = (e: CalEvent) => {
    const n = e.path ? getNode(e.path) : undefined
    if (n) openNode(n)
    else openUpdates()
    onClose()
  }

  return (
    <div className="calendar" ref={ref} role="dialog" aria-label={t('desktop.calendar.label')}>
      <div className="cal-head">
        <strong>{today.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</strong>
      </div>
      <div className="cal-nav">
        <button type="button" className="round-btn" onClick={() => shift(-1)} aria-label={t('desktop.calendar.previous')}>‹</button>
        <span aria-live="polite">{title}</span>
        <button type="button" className="round-btn" onClick={() => shift(1)} aria-label={t('desktop.calendar.next')}>›</button>
      </div>
      <table className="cal-grid">
        <thead>
          <tr>{WEEKDAYS.map((d) => <th key={d} scope="col">{d}</th>)}</tr>
        </thead>
        <tbody>
          {monthGrid(view.y, view.m).map((week, i) => (
            <tr key={i}>
              {week.map((d, j) => {
                if (!d) return <td key={j} />
                const k = dayKey(d)
                const ev = byDay.get(k)
                const cls = [k === todayKey && 'cal-today', ev?.some((e) => e.kind === 'jam') && 'cal-jam', ev?.some((e) => e.kind === 'update') && 'cal-update', picked === k && 'cal-picked'].filter(Boolean).join(' ')
                return (
                  <td key={j}>
                    {ev ? (
                      <button type="button" className={cls} onClick={() => setPicked(picked === k ? null : k)} aria-pressed={picked === k}
                        aria-label={t('desktop.calendar.day-label', { date: d.toLocaleDateString(undefined, { day: 'numeric', month: 'long' }), count: ev.length })}>
                        {d.getDate()}
                      </button>
                    ) : (
                      <span className={cls || undefined}>{d.getDate()}</span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {picked && (
        <ul className="cal-events" aria-label={t('desktop.calendar.on-this-day')}>
          {shown.map((e, i) => (
            <li key={i}>
              <button type="button" onClick={() => open(e)} style={{ ['--ic-color' as string]: e.color }}>
                <span className={`cal-dot cal-dot-${e.kind}`} aria-hidden="true" />
                {e.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="cal-legend">
        <span><span className="cal-dot cal-dot-jam" aria-hidden="true" /> {t('desktop.calendar.jam')}</span>
        <span><span className="cal-dot cal-dot-update" aria-hidden="true" /> {t('desktop.calendar.update')}</span>
      </p>
      <div className="cal-timeline" aria-label={t('desktop.calendar.timeline')}>
        {years.map(([y, list]) => (
          <div key={y} className="cal-year">
            <span className="cal-year-n">{y}</span>
            <ul>
              {list.map((p) => (
                <li key={p.path}>
                  <button type="button" style={{ ['--ic-color' as string]: p.color }} onClick={() => { const n = getNode(p.path); if (n) openNode(n); onClose() }}>
                    <span className="sm-swatch" />
                    {p.name}
                    {p.jam && <span className="cal-jam-name">{p.jam}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
