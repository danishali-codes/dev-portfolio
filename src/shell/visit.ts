/**
 * Tells /api/visit how long this tab was visible, so the Stats window can show
 * total visits and the average time spent. Nothing is stored in the browser:
 * the page picks a random id for this page load, keeps it in memory so later
 * reports add to the same visit, and forgets it on reload. Browsers that send
 * Global Privacy Control or Do Not Track are left out entirely.
 *
 * While the tab is visible it also checks in once a minute, which is how the
 * taskbar knows how many people are on the site right now.
 */

const HEARTBEAT_MS = 60_000

function pageLoadId() {
  const abc = 'abcdefghijklmnopqrstuvwxyz0123456789'
  return [...crypto.getRandomValues(new Uint8Array(15))].map((b) => abc[b % abc.length]).join('')
}

export function startVisitClock() {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean }
  if (import.meta.env.DEV || nav.webdriver || nav.globalPrivacyControl || nav.doNotTrack === '1') return

  let visibleSince = document.visibilityState === 'visible' ? performance.now() : 0
  let pending = 0
  const id = pageLoadId()
  let first = true
  // The server caps each beacon too, but one page load should never add more than this in total.
  let allowance = 30 * 60

  const flush = (heartbeat = false) => {
    if (visibleSince) {
      const now = performance.now()
      pending += now - visibleSince
      // A heartbeat leaves the tab visible, so keep counting from now.
      visibleSince = heartbeat ? now : 0
    }
    const s = Math.min(allowance, Math.round(pending / 1000))
    if (!first && !heartbeat && s < 1) return
    const sent = navigator.sendBeacon?.('/api/visit', JSON.stringify(first ? { id, s, n: 1 } : heartbeat ? { id, s, h: 1 } : { id, s }))
    if (sent) {
      pending = allowance > s ? pending - s * 1000 : 0
      allowance -= s
      first = false
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
    else visibleSince = performance.now()
  })
  window.addEventListener('pagehide', () => flush())
  // The first report creates the row right away, so "online now" counts this tab from the start.
  flush(true)
  setInterval(() => {
    if (document.visibilityState === 'visible') flush(true)
  }, HEARTBEAT_MS)
}

let onlineCache: Promise<number | null> | undefined
let onlineAt = 0

/** How many tabs have the site open right now (including this one, unless it opted out), or null when unknown. */
export function loadOnline(): Promise<number | null> {
  if (!onlineCache || Date.now() - onlineAt > 30_000) {
    onlineAt = Date.now()
    onlineCache = fetch('/api/visit?online')
      .then((r) => (r.status === 200 ? r.json() : null))
      .then((b: { online?: number } | null) => (typeof b?.online === 'number' ? b.online : null))
      .catch(() => null)
  }
  return onlineCache
}
