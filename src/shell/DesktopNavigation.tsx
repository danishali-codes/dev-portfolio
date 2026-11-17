import { useEffect } from 'react'
import { topWindowId, useWindows } from '../store/windows'
import { initialiseHistory, specFromUrl, syncNavigation, updateMetadata } from './navigation'

export default function DesktopNavigation() {
  useEffect(() => {
    initialiseHistory()
    let applying = false
    const restore = () => {
      applying = true
      const spec = specFromUrl()
      if (spec) useWindows.getState().open(spec)
      else useWindows.setState((s) => ({ windows: s.windows.map((w) => ({ ...w, minimized: true })) }))
      updateMetadata(spec)
      applying = false
    }
    restore()
    const unsubscribe = useWindows.subscribe((state) => {
      if (applying) return
      syncNavigation(state.windows.find((w) => w.id === topWindowId(state.windows)))
    })
    window.addEventListener('popstate', restore)
    return () => { unsubscribe(); window.removeEventListener('popstate', restore) }
  }, [])
  return null
}
