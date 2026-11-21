// Full-screen gags: the blue screen after rm -rf, the hack, restart, shutdown and the fake blog login.
import { create } from 'zustand'
import { openTerminal } from '../shell/opener'
import { restart as rebootMachine } from '../shell/power'
import { useWindows } from '../store/windows'
import { useTerm } from '../terminal/store'
import { txt } from '../terminal/lines'
import { t } from '../text'
import { unlock } from '.'

export type Takeover = 'bsod' | 'hack' | 'restart' | 'shutdown' | 'wordpress'

export const useTakeover = create<{ mode: Takeover | null }>()(() => ({ mode: null }))

export function takeover(mode: Takeover | null) {
  useTakeover.setState({ mode })
}

const GOTCHA: Partial<Record<Takeover, () => string>> = {
  bsod: () => t('gags.gotcha.bsod'),
  hack: () => t('gags.gotcha.hack'),
}

/** Close every window, open a fresh terminal and leave a note in it. */
export function goHome(from: Takeover) {
  document.documentElement.removeAttribute('data-wipe')
  takeover(null)
  useWindows.setState({ windows: [] })
  window.dispatchEvent(new Event('folioos:home'))
  const note = GOTCHA[from]
  if (note) {
    useTerm.setState({ lines: [], cwd: '/', handler: null, program: null })
    useTerm.getState().push([txt(t('gags.gotcha.title'), 'bold')], [txt(note(), 'dim')], [])
  }
  openTerminal()
  if (from === 'bsod') unlock('rm')
  if (from === 'hack') unlock('hack')
}

/** rm -rf /: the desktop empties out, then the blue screen. */
export function wipe(afterMs: number) {
  setTimeout(() => {
    document.documentElement.dataset.wipe = '1'
  }, Math.max(0, afterMs - 1400))
  setTimeout(() => takeover('bsod'), afterMs)
}

/** Restart: a short "restarting" screen, then every window closes and the boot sequence plays again. */
export function restart() {
  unlock('restart')
  takeover('restart')
  setTimeout(() => {
    takeover(null)
    rebootMachine()
  }, 1500)
}

export function shutdown() {
  takeover('shutdown')
}
