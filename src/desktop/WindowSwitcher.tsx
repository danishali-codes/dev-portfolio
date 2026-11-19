import { useEffect, useRef, useState } from 'react'
import { t } from '../text'
import { focusTopWindow } from '../shell/focus'
import { useWindows } from '../store/windows'

/**
 * Alt+` flips between windows like Alt+Tab (which the browser keeps for itself).
 * Hold Alt and press ` again to move along; let go of Alt to switch. Shift goes back.
 */
export default function WindowSwitcher() {
  const windows = useWindows((s) => s.windows)
  const [state, setState] = useState<{ order: string[]; at: number } | null>(null)
  const live = useRef(state)
  live.current = state

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (!e.altKey || e.code !== 'Backquote') {
        if (e.key === 'Escape' && live.current) setState(null)
        return
      }
      e.preventDefault()
      const cur = live.current
      if (cur) return setState({ ...cur, at: (cur.at + (e.shiftKey ? -1 : 1) + cur.order.length) % cur.order.length })
      const order = [...useWindows.getState().windows].sort((a, b) => Number(a.minimized) - Number(b.minimized) || b.z - a.z).map((w) => w.id)
      if (order.length < 2) return
      setState({ order, at: e.shiftKey ? order.length - 1 : 1 })
    }
    const onUp = (e: KeyboardEvent) => {
      if (e.key !== 'Alt' || !live.current) return
      const { order, at } = live.current
      setState(null)
      useWindows.getState().focus(order[at])
      requestAnimationFrame(focusTopWindow)
    }
    const cancel = () => setState(null)
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', cancel)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', cancel)
    }
  }, [])

  if (!state) return null
  const byId = new Map(windows.map((w) => [w.id, w]))
  return (
    <div className="switcher" role="listbox" aria-label={t('desktop.switcher.label')}>
      {state.order.map((id, i) => {
        const w = byId.get(id)
        if (!w) return null
        return (
          <div key={id} role="option" aria-selected={i === state.at} className={`switcher-item${i === state.at ? ' on' : ''}`} style={{ ['--ic-color' as string]: w.color }}>
            <span className={`win-glyph win-glyph-${w.kind}`} aria-hidden="true" />
            <span className="switcher-title">{w.title}</span>
            {w.minimized && <span className="switcher-min">{t('desktop.switcher.minimised')}</span>}
          </div>
        )
      })}
      <p className="switcher-hint">{t('desktop.switcher.hint')}</p>
    </div>
  )
}
