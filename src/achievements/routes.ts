// Secret URLs. The x-achievement response header (vercel.json) and the DNS TXT record on
// danishali.dev point at /found/headers and /found/dug. Ideas from lupine.dev.
import { unlock, useAchievements } from '.'
import { usePower } from '../shell/power'
import { setResume } from '../shell/plain'
import { takeover } from './effects'

const FOUND: Record<string, string> = {
  headers: 'header',
  dug: 'dns',
}

/** Handle a secret URL before the desktop boots. Returns true if the path was one. */
export function handleSecretPath() {
  const path = location.pathname.replace(/\/+$/, '').toLowerCase()
  const found = path.match(/^\/found\/([a-z-]+)$/)
  if (found && FOUND[found[1]]) {
    history.replaceState(null, '', '/')
    setResume(false)
    const reveal = () => setTimeout(() => {
      const id = FOUND[found[1]]
      unlock(id)
      // A repeat visit still confirms the find, without changing its recorded time.
      useAchievements.setState({ latest: { id, at: Date.now() }, notepadOpen: true })
    }, 450)
    if (usePower.getState().phase === 'on') reveal()
    else {
      const unsubscribe = usePower.subscribe((state) => {
        if (state.phase !== 'on') return
        unsubscribe()
        reveal()
      })
    }
    return true
  }
  if (/^\/(wp-admin|wp-login\.php|wordpress\/wp-admin|wp-login)(\/|$)/.test(path) || path === '/wp-admin.php' || path === '/xmlrpc.php') {
    history.replaceState(null, '', '/')
    takeover('wordpress')
    return true
  }
  return false
}
