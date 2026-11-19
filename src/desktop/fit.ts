import { useEffect, type RefObject } from 'react'

/** Fewest icon columns the desktop shows, even when one column would fit. */
const MIN_COLS = 2

/**
 * How many icon columns the desktop needs so every icon fits above the taskbar.
 * Pure, so it can be tested: `space` is the height the icon list may use.
 */
export function iconColumns(count: number, space: number, iconH: number, gap: number): number {
  if (count <= 0 || iconH <= 0) return MIN_COLS
  const rows = Math.max(1, Math.floor((space + gap) / (iconH + gap)))
  return Math.max(MIN_COLS, Math.ceil(count / rows))
}

/**
 * Index of the first stacked note that would poke out of a box `space` px tall,
 * given each note's top edge and height in layout order. Notes from there on are hidden.
 */
export function firstOverflow(boxes: { top: number; height: number }[], space: number): number {
  const i = boxes.findIndex((b) => b.top + b.height > space)
  return i === -1 ? boxes.length : i
}

function observe(el: Element, run: () => void) {
  const ro = new ResizeObserver(run)
  ro.observe(el)
  const mo = new MutationObserver(run)
  mo.observe(el, { childList: true })
  window.addEventListener('resize', run)
  run()
  return () => {
    ro.disconnect()
    mo.disconnect()
    window.removeEventListener('resize', run)
  }
}

/** Adds icon columns when the icons would not all fit above the taskbar (short windows). */
export function useIconColumns(list: RefObject<HTMLElement | null>, area: RefObject<HTMLElement | null>, key: unknown) {
  useEffect(() => {
    const ul = list.current
    const box = area.current
    if (!ul || !box) return
    return observe(box, () => {
      const first = ul.firstElementChild as HTMLElement | null
      if (!first) return
      const cs = getComputedStyle(ul)
      const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)
      const cols = iconColumns(ul.children.length, box.clientHeight - pad, first.offsetHeight, parseFloat(cs.rowGap) || 0)
      if (ul.style.getPropertyValue('--desk-cols') === String(cols)) return
      ul.style.setProperty('--desk-cols', String(cols))
      // Icons that were dragged sit relative to their grid cell, which just moved: let them refit (Draggable listens for resize).
      requestAnimationFrame(() => window.dispatchEvent(new Event('resize')))
    })
  }, [list, area, key])
}

/** Hides the sticky notes (now note, guestbook notes) that would hang below the taskbar. */
export function useNotesFit(column: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const col = column.current
    if (!col) return
    let busy = false
    return observe(col, () => {
      if (busy) return
      busy = true
      const kids = [...col.children] as HTMLElement[]
      kids.forEach((k) => k.classList.remove('note-off'))
      const shown = kids.filter((k) => k.offsetParent !== null)
      const cut = firstOverflow(
        shown.map((k) => ({ top: k.offsetTop, height: k.offsetHeight })),
        col.clientHeight,
      )
      shown.slice(cut).forEach((k) => k.classList.add('note-off'))
      busy = false
    })
  }, [column])
}
