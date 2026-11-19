import { useCallback, useEffect, useState } from 'react'
import { projects } from '../fs'
import { usePower } from '../shell/power'
import { setResume } from '../shell/plain'
import { lines, t } from '../text'

type Screen = 'post' | 'splash'

/** Each firmware line, split at " | " into the left half and the status on the right. */
function postLines(): [string, string][] {
  return lines('gags.boot.firmware', { projects: projects().length }).map((l) => {
    const at = l.lastIndexOf(' | ')
    return at < 0 ? [l, ''] : [l.slice(0, at), l.slice(at + 3)]
  })
}

/** Firmware text in the terminal's green, a line at a time, like a machine powering on. */
function Post({ onDone }: { onDone: () => void }) {
  const [lines] = useState(postLines)
  const [shown, setShown] = useState(0)
  useEffect(() => {
    if (shown >= lines.length) {
      const t = setTimeout(onDone, 380)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setShown((s) => s + 1), shown === 0 ? 420 : 170)
    return () => clearTimeout(t)
  }, [shown, lines.length, onDone])
  return (
    <div className="boot-post">
      <pre>
        {lines.slice(0, shown).map(([l, r], i) => (
          <div key={i} className={i === 0 ? 'boot-head' : undefined}>
            {r ? `${l} ${'.'.repeat(Math.max(2, 40 - l.length))} ${r}` : l}
          </div>
        ))}
        <span className="boot-cursor" />
      </pre>
    </div>
  )
}

/** The Soft Paper logo and a chunky progress bar. */
function Splash({ duration, onDone }: { duration: number; onDone: () => void }) {
  const [step, setStep] = useState(0)
  const [steps] = useState(() => lines('gags.boot.steps'))
  useEffect(() => {
    const per = duration / steps.length
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, steps.length - 1)), per)
    const done = setTimeout(onDone, duration)
    return () => {
      clearInterval(timer)
      clearTimeout(done)
    }
  }, [duration, onDone, steps.length])
  return (
    <div className="boot-splash">
      <div className="boot-logo" aria-hidden="true">
        {t('desktop.initials')}
      </div>
      <div className="boot-name">{t('gags.boot.name')}</div>
      <div className="boot-bar" aria-hidden="true">
        <span style={{ animationDuration: `${duration}ms` }} />
      </div>
      <div className="boot-step">{steps[step]}</div>
    </div>
  )
}

/**
 * The start-up screen. Plays on every page load and after a restart; any key or
 * click skips it. Reloads in the same tab and reduced motion get the short version.
 */
export default function Boot() {
  const { phase, short, boots, setPhase } = usePower()
  // What is on screen. It stays put while the boot screen fades out.
  const live: Screen | null = phase === 'post' ? (short ? null : 'post') : phase === 'splash' ? 'splash' : null
  const [screen, setScreen] = useState<Screen | null>(live)
  const [leaving, setLeaving] = useState(false)
  if (live && live !== screen) setScreen(live)
  if (live && leaving) setLeaving(false)

  const toSplash = useCallback(() => setPhase('splash'), [setPhase])
  const finish = useCallback(() => {
    setLeaving(true)
    setPhase('on')
  }, [setPhase])

  useEffect(() => {
    if (phase === 'post' && short) setPhase('splash')
  }, [phase, short, setPhase, boots])

  // Any key skips the rest, and doesn't reach whatever is underneath.
  useEffect(() => {
    if (phase === 'on') return
    const skip = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      finish()
    }
    window.addEventListener('keydown', skip, true)
    return () => window.removeEventListener('keydown', skip, true)
  }, [phase, finish])

  useEffect(() => {
    if (!leaving) return
    const t = setTimeout(() => {
      setLeaving(false)
      setScreen(null)
    }, 450)
    return () => clearTimeout(t)
  }, [leaving])

  if (phase === 'on' && !leaving) return null
  return (
    <div className={`boot${leaving ? ' leaving' : ''}${screen === 'post' ? ' boot-dark' : ''}`} role="status" aria-label={t('gags.boot.label')} onPointerDown={finish}>
      {screen === 'post' && <Post key={boots} onDone={toSplash} />}
      {screen === 'splash' && <Splash key={boots} duration={short ? 700 : 1500} onDone={finish} />}
      {!leaving && (
        <div className="boot-skip">
          <button
            type="button"
            className="boot-resume"
            onPointerDown={(e) => {
              e.stopPropagation()
              setResume(true)
            }}
          >
            {t('gags.boot.skip-to-resume')}
          </button>
          <span className="keys">{t('gags.boot.skip-keys')}</span>
          <span className="touch">{t('gags.boot.skip-touch')}</span>
        </div>
      )}
    </div>
  )
}
