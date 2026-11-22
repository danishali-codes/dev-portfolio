import { create } from 'zustand'
import { useTerm } from '../terminal/store'
import { useWindows } from '../store/windows'
import { applyRouteMeta } from './pages'

/**
 * The machine's power state. The boot screen shows whenever `phase` isn't 'on'.
 *
 * `boots` counts boots in this page load, so anything that should happen once the
 * desktop is fresh (opening the terminal, say) can watch it.
 */
export type Phase = 'post' | 'splash' | 'on'

interface PowerState {
  phase: Phase
  /** A short boot skips the BIOS text. Reduced motion uses it; a restart does too. */
  short: boolean
  boots: number
  setPhase: (p: Phase) => void
}

const BOOT_KEY = 'devportfolio.booted'

function rememberBoot() {
  try {
    localStorage.setItem(BOOT_KEY, '1')
  } catch {
    /* storage blocked */
  }
}

/** True after a finished boot in this browser. The old same-tab flag still counts. */
function bootedBefore() {
  try {
    if (localStorage.getItem(BOOT_KEY) === '1') return true
    if (sessionStorage.getItem(BOOT_KEY) === '1') {
      rememberBoot()
      return true
    }
  } catch {
    /* storage blocked */
  }
  return false
}

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

export const usePower = create<PowerState>()((set) => ({
  // A return visit paints the desktop immediately. The first visit still boots.
  phase: bootedBefore() ? 'on' : 'post',
  short: reducedMotion(),
  boots: 1,
  setPhase: (phase) => {
    if (phase === 'on') rememberBoot()
    set({ phase })
  },
}))

/**
 * Restart the machine: every window closes, the terminal forgets its session,
 * the URL goes back to / and the boot sequence plays again.
 */
export function restart() {
  useWindows.setState({ windows: [], topZ: 1 })
  useTerm.setState({ lines: [], cwd: '/', handler: null, program: null })
  if (location.pathname !== '/') history.replaceState(null, '', '/')
  applyRouteMeta()
  usePower.setState((s) => ({ phase: 'post', short: reducedMotion(), boots: s.boots + 1 }))
}
