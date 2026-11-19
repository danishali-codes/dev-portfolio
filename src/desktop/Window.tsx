import { createPortal } from 'react-dom'
import { t } from '../text'
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from 'react'
import CopyLink from '../apps/CopyLink'
import { focusTopWindow } from '../shell/focus'
import { useWindows, type Win } from '../store/windows'

type Edge = 'move' | 'e' | 's' | 'se' | 'w' | 'sw'
type SnapZone = 'left' | 'right' | 'max' | null

/** How close to a screen edge the pointer has to be to snap. */
const EDGE = 8

function zoneAt(x: number, y: number): SnapZone {
  if (window.innerWidth < 760) return null
  if (x <= EDGE) return 'left'
  if (x >= window.innerWidth - EDGE) return 'right'
  if (y <= EDGE / 2) return 'max'
  return null
}

export default function Window({ win, active, children }: { win: Win; active: boolean; children: ReactNode }) {
  const { focus, close, minimize, toggleMaximize, setBounds, snap, unsnap } = useWindows()
  // Where a dragged window would land if let go now: a screen edge snaps it.
  const [zone, setZone] = useState<SnapZone>(null)
  const ref = useRef<HTMLElement>(null)
  const drag = useRef<{ edge: Edge; sx: number; sy: number; x: number; y: number; w: number; h: number } | null>(null)
  // A live app restored minimised from the last visit waits until it is first shown before loading.
  const [shown, setShown] = useState(!win.minimized)
  if (!shown && !win.minimized) setShown(true)

  // Minimising hides a window without unmounting it, so stop anything it was playing.
  useEffect(() => {
    if (!win.minimized) return
    ref.current?.querySelectorAll<HTMLMediaElement>('video, audio').forEach((media) => media.pause())
  }, [win.minimized])

  // A new window takes keyboard focus (unless its content already grabbed it, like the terminal prompt).
  useEffect(() => {
    const el = ref.current
    if (active && el && !el.contains(document.activeElement)) el.focus({ preventScroll: true })
    // Only on mount: later focus changes come from the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** After closing or minimising, hand focus to the next window so keyboard users are not dropped on <body>. */
  function handOff(action: () => void) {
    const hadFocus = ref.current?.contains(document.activeElement)
    action()
    if (hadFocus) requestAnimationFrame(focusTopWindow)
  }

  function start(edge: Edge) {
    return (e: RPointerEvent) => {
      if (win.maximized || e.button !== 0) return
      if ((e.target as HTMLElement).closest('button')) return
      e.preventDefault()
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      drag.current = { edge, sx: e.clientX, sy: e.clientY, x: win.x, y: win.y, w: win.w, h: win.h }
      focus(win.id)
    }
  }

  function move(e: RPointerEvent) {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.sx
    const dy = e.clientY - d.sy
    const minW = 320
    const minH = 200
    if (d.edge === 'move') {
      // Dragging a snapped window away from its edge gives it back its old size, under the pointer.
      if (win.restore && Math.hypot(dx, dy) > 6) {
        const r = win.restore
        const x = e.clientX - (r.w * (e.clientX - d.x)) / d.w
        drag.current = { ...d, x, w: r.w, h: r.h }
        unsnap(win.id)
        return setBounds(win.id, { x, y: d.y + dy })
      }
      setZone(zoneAt(e.clientX, e.clientY))
      const maxX = window.innerWidth - 80
      const maxY = window.innerHeight - 54 - 60
      return setBounds(win.id, { x: Math.min(maxX, Math.max(-d.w + 80, d.x + dx)), y: Math.min(maxY, Math.max(0, d.y + dy)) })
    }
    const b: Partial<Win> = {}
    if (d.edge.includes('e')) b.w = Math.max(minW, d.w + dx)
    if (d.edge.includes('s')) b.h = Math.max(minH, d.h + dy)
    if (d.edge.includes('w')) {
      const w = Math.max(minW, d.w - dx)
      b.w = w
      b.x = d.x + (d.w - w)
    }
    setBounds(win.id, b)
  }

  const end = () => {
    if (drag.current?.edge === 'move' && zone) {
      if (zone === 'max') toggleMaximize(win.id)
      else snap(win.id, zone)
    }
    drag.current = null
    setZone(null)
  }
  const handle = (edge: Edge) => ({ onPointerDown: start(edge), onPointerMove: move, onPointerUp: end, onPointerCancel: end })

  const style = win.maximized
    ? { zIndex: win.z }
    : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z }

  return (
    <section
      ref={ref}
      tabIndex={-1}
      data-win={win.id}
      className={`win${active ? ' active' : ''}${win.maximized ? ' max' : ''} win-${win.kind}`}
      style={{ ...style, ['--win-color' as string]: win.color }}
      onPointerDown={() => focus(win.id)}
      // Tabbing into a window behind others brings it to the front (programmatic focus does not).
      onFocus={(e) => e.relatedTarget && !active && focus(win.id)}
      onKeyDown={(e) => {
        // Escape closes menus first; inside a window it is free for content, so use Alt+W to close.
        if (e.altKey && (e.key === 'w' || e.key === 'W')) {
          e.preventDefault()
          handOff(() => close(win.id))
        }
        // Ctrl+Alt+arrows: snap left or right, maximise, or go back to the old size.
        if (e.ctrlKey && e.altKey && e.key.startsWith('Arrow')) {
          e.preventDefault()
          if (e.key === 'ArrowLeft') snap(win.id, 'left')
          if (e.key === 'ArrowRight') snap(win.id, 'right')
          if (e.key === 'ArrowUp' && !win.maximized) toggleMaximize(win.id)
          if (e.key === 'ArrowDown') {
            if (win.maximized) toggleMaximize(win.id)
            else unsnap(win.id)
          }
        }
      }}
      aria-labelledby={`${win.id}-title`}
      hidden={win.minimized}
    >
      <header className="win-bar" {...handle('move')} onDoubleClick={() => toggleMaximize(win.id)}>
        <span className={`win-glyph win-glyph-${win.kind}`} aria-hidden="true" />
        <span className="win-title" id={`${win.id}-title`}>
          {win.title}
        </span>
        <div className="win-buttons">
          <CopyLink spec={win} />
          <button type="button" className="b-min" onClick={() => handOff(() => minimize(win.id))} aria-label={t('desktop.window.minimise-label', { title: win.title })} title={t('desktop.window.minimise')}>
            –
          </button>
          <button type="button" className="b-max" onClick={() => toggleMaximize(win.id)} aria-label={win.maximized ? t('desktop.window.restore-label', { title: win.title }) : t('desktop.window.maximise-label', { title: win.title })}
            title={win.maximized ? t('desktop.window.restore') : t('desktop.window.maximise')}>
            +
          </button>
          <button type="button" className="b-close" onClick={() => handOff(() => close(win.id))} aria-label={t('desktop.window.close-label', { title: win.title })} title={t('desktop.window.close')}>
            ×
          </button>
        </div>
      </header>
      {zone && createPortal(<div className={`snap-preview snap-${zone}`} aria-hidden="true" />, document.body)}
      <div className="win-body">{shown || win.kind !== 'app' ? children : null}</div>
      {!win.maximized && (
        <>
          <div className="rz rz-e" {...handle('e')} />
          <div className="rz rz-w" {...handle('w')} />
          <div className="rz rz-s" {...handle('s')} />
          <div className="rz rz-se" {...handle('se')} />
          <div className="rz rz-sw" {...handle('sw')} />
        </>
      )}
    </section>
  )
}

