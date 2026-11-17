const KEY = 'devportfolio.resume'

type Listener = (on: boolean) => void
const listeners = new Set<Listener>()

/** /resume and /simple both mean the plain page. */
export function resumePath(pathname: string) {
  const key = pathname.replace(/\/+$/, '').replace(/^\//, '').toLowerCase()
  return key === 'resume' || key === 'simple'
}

/** True when this visit should skip the desktop: the URL says so, or they chose it before. */
export function resumeOn(pathname = location.pathname) {
  if (resumePath(pathname)) return true
  if (pathname.replace(/\/+$/, '') !== '') return false
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function setResume(on: boolean) {
  try {
    if (on) localStorage.setItem(KEY, '1')
    else localStorage.removeItem(KEY)
  } catch {
    /* private mode still switches for this visit */
  }
  const path = on ? '/resume' : '/'
  if (location.pathname !== path) {
    history.pushState({ paperosIndex: (history.state?.paperosIndex ?? 0) + 1 }, '', path)
    window.dispatchEvent(new Event('paperos:navigation'))
  }
  listeners.forEach((fn) => fn(on))
}

export function watchResume(fn: Listener) {
  listeners.add(fn)
  return () => void listeners.delete(fn)
}
