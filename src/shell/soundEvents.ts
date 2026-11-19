import { useWindows } from '../store/windows'
import { usePower } from './power'
import { play } from './sound'

/** Plays the interface sounds for things that happen anywhere on the desktop. They only sound when turned on. */
export function wireSounds() {
  useWindows.subscribe((s, prev) => {
    if (s.windows.length > prev.windows.length) return play('open')
    if (s.windows.length < prev.windows.length) return play('close')
    const minimised = (ws: typeof s.windows) => ws.filter((w) => w.minimized).length
    if (minimised(s.windows) > minimised(prev.windows)) play('minimize')
  })
  usePower.subscribe((s, prev) => {
    if (s.phase === 'on' && prev.phase !== 'on') play('chime')
  })
}
