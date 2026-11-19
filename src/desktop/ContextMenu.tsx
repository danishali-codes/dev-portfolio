import { useEffect, useRef, useState } from 'react'
import { t } from '../text'

interface MenuItem {
  label: string
  run: () => void
  hint?: string
}

/** The right-click menu on the desktop. Arrow keys move, Enter picks, Escape or a click elsewhere closes it. */
export default function ContextMenu({ x, y, items, onClose }: { x: number; y: number; items: (MenuItem | 'sep')[]; onClose: () => void }) {
  const ref = useRef<HTMLUListElement>(null)
  const picked = useRef(false)
  const [pos, setPos] = useState({ x, y })
  useEffect(() => {
    const menu = ref.current
    if (!menu) return
    // Keep the menu on screen near the right and bottom edges.
    // offsetWidth/Height, not the bounding box, which the open animation scales down.
    const bottom = window.innerHeight - 54 - 8
    setPos({ x: Math.max(8, Math.min(x, window.innerWidth - menu.offsetWidth - 8)), y: Math.max(8, Math.min(y, bottom - menu.offsetHeight)) })
    const opener = document.activeElement as HTMLElement | null
    menu.querySelector<HTMLElement>('button')?.focus()
    return () => {
      // A picked item may have opened or focused a window on purpose, so only hand focus back on Escape or a click away.
      if (picked.current) return
      const now = document.activeElement
      if (!now || now === document.body || menu.contains(now)) opener?.focus?.()
    }
  }, [x, y])
  useEffect(() => {
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && onClose()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onClose()
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
      e.preventDefault()
      const btns = [...(ref.current?.querySelectorAll<HTMLElement>('button') ?? [])]
      const at = btns.indexOf(document.activeElement as HTMLElement)
      btns[(at + (e.key === 'ArrowDown' ? 1 : btns.length - 1)) % btns.length]?.focus()
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('blur', onClose)
    window.addEventListener('resize', onClose)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('blur', onClose)
      window.removeEventListener('resize', onClose)
    }
  }, [onClose])
  return (
    <ul className="ctx-menu" role="menu" aria-label={t('desktop.menu.label')} ref={ref} style={{ left: pos.x, top: pos.y }}>
      {items.map((it, i) =>
        it === 'sep' ? (
          <li key={i} className="ctx-sep" role="separator" />
        ) : (
          <li key={it.label} role="none">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                picked.current = true
                it.run()
                onClose()
              }}
            >
              {it.label}
              {it.hint && <kbd>{it.hint}</kbd>}
            </button>
          </li>
        ),
      )}
    </ul>
  )
}
