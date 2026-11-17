import { useEffect } from 'react'
import { INTRODUCTION } from './opener'
import { topWindowId, useWindows } from '../store/windows'
import { initialiseHistory, specFromUrl, syncNavigation, updateMetadata } from './navigation'

export default function DesktopNavigation() {
  useEffect(() => {
    initialiseHistory()
    let applying = false
    const restore = (initial = false) => {
      applying = true
      const spec = specFromUrl()
      if (spec) useWindows.getState().open(spec)
      else useWindows.setState((s) => ({ windows: s.windows.map((w) => ({ ...w, minimized: true })) }))
      if (initial && !spec && location.pathname === '/') useWindows.getState().open(INTRODUCTION)
      updateMetadata(spec)
      applying = false
    }
    restore(true)
    const unsubscribe = useWindows.subscribe((state) => {
      if (applying) return
      syncNavigation(state.windows.find((w) => w.id === topWindowId(state.windows)))
    })
    const onPopState = () => restore()
    window.addEventListener('popstate', onPopState)
    return () => { unsubscribe(); window.removeEventListener('popstate', onPopState) }
  }, [])
  return null
}
