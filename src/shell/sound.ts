import { useSyncExternalStore } from 'react'

/**
 * Small interface sounds, made with the Web Audio API so there are no files to
 * download. Off until the visitor turns them on with the speaker in the taskbar,
 * and the choice is remembered on this device.
 */
const KEY = 'devportfolio.sound'

let on = (() => {
  try {
    return localStorage.getItem(KEY) === 'on'
  } catch {
    return false
  }
})()
const listeners = new Set<() => void>()
let ctx: AudioContext | undefined

export function soundOn() {
  return on
}

export function setSound(value: boolean) {
  on = value
  try {
    localStorage.setItem(KEY, value ? 'on' : 'off')
  } catch {
    /* private mode: the choice lasts for this visit */
  }
  listeners.forEach((l) => l())
  if (value) play('chime')
}

export function useSound(): [boolean, (v: boolean) => void] {
  const value = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    soundOn,
    () => false,
  )
  return [value, setSound]
}

type Note = [freq: number, start: number, length: number, type?: OscillatorType, gain?: number]

const SOUNDS: Record<string, Note[]> = {
  // Three rising notes, like an old OS starting up.
  chime: [
    [523.25, 0, 0.5, 'sine', 0.12],
    [659.25, 0.12, 0.5, 'sine', 0.1],
    [783.99, 0.24, 0.7, 'sine', 0.09],
  ],
  open: [
    [660, 0, 0.07, 'triangle', 0.06],
    [990, 0.04, 0.08, 'triangle', 0.05],
  ],
  close: [
    [700, 0, 0.06, 'triangle', 0.05],
    [440, 0.04, 0.08, 'triangle', 0.05],
  ],
  minimize: [[520, 0, 0.08, 'triangle', 0.05]],
  click: [[1200, 0, 0.025, 'square', 0.025]],
  error: [
    [220, 0, 0.12, 'square', 0.04],
    [180, 0.1, 0.16, 'square', 0.04],
  ],
}

export type SoundName = keyof typeof SOUNDS

/** Plays a sound if sounds are on. Silently does nothing where audio isn't allowed yet. */
export function play(name: SoundName) {
  if (!on || typeof window === 'undefined' || !('AudioContext' in window)) return
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    const t0 = ctx.currentTime + 0.01
    for (const [freq, start, length, type = 'sine', gain = 0.05] of SOUNDS[name]) {
      const osc = ctx.createOscillator()
      const amp = ctx.createGain()
      osc.type = type
      osc.frequency.value = freq
      amp.gain.setValueAtTime(0, t0 + start)
      amp.gain.linearRampToValueAtTime(gain, t0 + start + 0.01)
      amp.gain.exponentialRampToValueAtTime(0.0001, t0 + start + length)
      osc.connect(amp).connect(ctx.destination)
      osc.start(t0 + start)
      osc.stop(t0 + start + length + 0.02)
    }
  } catch {
    /* no audio, no problem */
  }
}
