import { useEffect, useState } from 'react'
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
      setStatus('Copied')
    } catch {
      setStatus('Copy unavailable')
      window.prompt('Copy this link', url)
    }
  }
  return <button type="button" className="pill copy-link" onClick={copy} aria-live="polite">{status || 'Copy link'}</button>
}
