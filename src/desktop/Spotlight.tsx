import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { t } from '../text'

const loadPalette = () => import('./SpotlightPalette')
const Palette = lazy(loadPalette)

function Fallback({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="spotlight-scrim" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="spotlight" role="dialog" aria-modal="true" aria-busy="true" aria-label={t('desktop.spotlight.label')}>
        <p className="spotlight-hint">{t('windows.loading')}</p>
      </div>
    </div>
  )
}

/** Ctrl+K (or ⌘K). The palette and its terminal index stay out of the first paint, then load when the browser is idle. */
export default function Spotlight() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const opener = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setMounted(true)
        setOpen((o) => {
          if (!o) opener.current = document.activeElement as HTMLElement | null
          return !o
        })
      }
    }
    const show = () => {
      opener.current = document.activeElement as HTMLElement | null
      setMounted(true)
      setOpen(true)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('folioos:spotlight', show)
    const idle = window.requestIdleCallback?.(() => void loadPalette(), { timeout: 2000 })
    const wait = idle == null ? window.setTimeout(() => void loadPalette(), 1200) : undefined
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('folioos:spotlight', show)
      if (idle != null) window.cancelIdleCallback(idle)
      if (wait != null) window.clearTimeout(wait)
    }
  }, [])

  const close = (restore = true) => {
    setOpen(false)
    if (restore) opener.current?.focus?.({ preventScroll: true })
  }

  if (!mounted) return null
  return (
    <Suspense fallback={open ? <Fallback onClose={() => close()} /> : null}>
      <Palette open={open} onClose={close} />
    </Suspense>
  )
}
