import { useEffect, useState } from 'react'
import { t } from '../text'
import type { OpenSpec } from '../store/windows'
import { routeFor } from '../shell/navigation'

export default function CopyLink({ spec }: { spec: OpenSpec }) {
  const [status, setStatus] = useState('')
  useEffect(() => {
    if (!status) return
    const timer = setTimeout(() => setStatus(''), 2200)
    return () => clearTimeout(timer)
  }, [status])
  const copy = async () => {
    const url = new URL(routeFor(spec), location.origin).href
    try {
      await navigator.clipboard.writeText(url)
      setStatus(t('windows.copy-link.copied'))
    } catch {
      setStatus(t('windows.copy-link.unavailable'))
      window.prompt(t('windows.copy-link.prompt'), url)
    }
  }
  if (spec.kind === 'notfound') return null
  return <button type="button" className="pill copy-link" onClick={copy} aria-live="polite">{status || t('windows.copy-link.copy')}</button>
}
