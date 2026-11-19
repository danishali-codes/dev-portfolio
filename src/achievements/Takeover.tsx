import { useEffect, useRef, useState, type FormEvent } from 'react'
import { unlock } from '.'
import { goHome, takeover, useTakeover, type Takeover as Mode } from './effects'
import { lines, t } from '../text'

/** Any key, click or tap after a short delay calls `go`. The delay stops the key that started it from ending it. */
function useAnyKey(go: () => void, delay = 900) {
  const ready = useRef(false)
  const goRef = useRef(go)
  useEffect(() => {
    goRef.current = go
  })
  useEffect(() => {
    const t = setTimeout(() => (ready.current = true), delay)
    const on = (e: Event) => {
      if (!ready.current) return
      if (e instanceof KeyboardEvent && ['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return
      e.preventDefault()
      e.stopPropagation()
      goRef.current()
    }
    window.addEventListener('keydown', on, true)
    window.addEventListener('pointerdown', on, true)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', on, true)
      window.removeEventListener('pointerdown', on, true)
    }
  }, [delay])
}

function Bsod() {
  const [pct, setPct] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setPct((p) => (p >= 100 ? 100 : Math.min(100, p + Math.ceil(Math.random() * 14)))), 260)
    return () => clearInterval(t)
  }, [])
  useAnyKey(() => goHome('bsod'), 1200)
  return (
    <div className="to to-bsod" role="alertdialog" aria-label={t('gags.bsod.label')}>
      <div className="bsod-inner">
        <div className="bsod-face">{t('gags.bsod.face')}</div>
        <p className="bsod-big">{t('gags.bsod.big')}</p>
        <p>{t('gags.bsod.body')}</p>
        <p className="bsod-pct">{t('gags.bsod.progress', { percent: pct })}</p>
        <div className="bsod-foot">
          <div className="bsod-qr" aria-hidden="true">
            {Array.from({ length: 49 }, (_, i) => (
              <span key={i} style={{ opacity: (i * 7919) % 3 ? 1 : 0 }} />
            ))}
          </div>
          <div>
            <p>{t('gags.bsod.more-info')}</p>
            <p>{t('gags.bsod.stop-code')}</p>
            <p className="bsod-any">{pct >= 100 ? t('gags.bsod.any-key') : ' '}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

const HEX = '0123456789abcdef'

function Hack() {
  const [loot] = useState(() => lines('gags.hack.loot'))
  const [rows, setRows] = useState<string[]>([])
  const [phase, setPhase] = useState(0)
  useEffect(() => {
    const t = setInterval(() => {
      const row = Array.from({ length: 8 }, () => Array.from({ length: 4 }, () => HEX[Math.floor(Math.random() * 16)]).join('')).join(' ')
      setRows((r) => [...r.slice(-40), `0x${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}  ${row}`])
    }, 40)
    const p1 = setTimeout(() => setPhase(1), 1600)
    const p2 = setTimeout(() => setPhase(2), 1600 + loot.length * 380 + 400)
    return () => {
      clearInterval(t)
      clearTimeout(p1)
      clearTimeout(p2)
    }
  }, [loot.length])
  useAnyKey(() => goHome('hack'), 2400)
  return (
    <div className="to to-hack" role="alertdialog" aria-label={t('gags.hack.label')}>
      <pre className="hack-rain" aria-hidden="true">{rows.join('\n')}</pre>
      {phase >= 1 && (
        <div className="hack-box">
          <div className="hack-title">{t('gags.hack.title')}</div>
          <ul>
            {loot.map((f, i) => (
              <li key={i} style={{ animationDelay: `${i * 380}ms` }}>
                {t('gags.hack.uploading', { file: f })}
              </li>
            ))}
          </ul>
          <p className="hack-any">{phase >= 2 ? t('gags.hack.any-key') : ' '}</p>
        </div>
      )}
    </div>
  )
}

function Restart() {
  return (
    <div className="to to-power" role="alert">
      <div className="power-spin" aria-hidden="true" />
      <p>{t('gags.restart')}</p>
    </div>
  )
}

function Shutdown() {
  const [stage, setStage] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => {
      setStage(1)
      unlock('shutdown')
    }, 1700)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="to to-power" role="alertdialog" aria-label={t('gags.shutdown.label')}>
      {stage === 0 ? (
        <>
          <div className="power-spin" aria-hidden="true" />
          <p>{t('gags.shutdown.shutting-down')}</p>
        </>
      ) : (
        <div className="power-fail">
          <p className="power-big">{t('gags.shutdown.failed')}</p>
          <p>{t('gags.shutdown.body')}</p>
          <p className="power-dim">{t('gags.shutdown.aside')}</p>
          <button type="button" className="pill" autoFocus onClick={() => takeover(null)}>
            {t('gags.shutdown.back')}
          </button>
        </div>
      )}
    </div>
  )
}

function WordPress() {
  const [tries, setTries] = useState(0)
  const leave = () => takeover(null)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTries((n) => n + 1)
    unlock('wordpress')
  }
  return (
    <div className="to to-wp" role="dialog" aria-label={t('gags.wordpress.label')}>
      <form className="wp-card" onSubmit={submit}>
        <div className="wp-logo" aria-hidden="true">
          {t('gags.wordpress.logo')}
        </div>
        {tries > 0 && (
          <p className="wp-error" role="alert">
            {tries === 1 ? t('gags.wordpress.first-error') : t('gags.wordpress.again-error')}
          </p>
        )}
        <label>
          {t('gags.wordpress.username')}
          <input name="log" autoComplete="off" autoFocus />
        </label>
        <label>
          {t('gags.wordpress.password')}
          <input name="pwd" type="password" autoComplete="off" />
        </label>
        <button type="submit" className="pill pill-dark">
          {t('gags.wordpress.log-in')}
        </button>
        <button type="button" className="wp-back" onClick={leave}>
          {t('gags.wordpress.back')}
        </button>
      </form>
    </div>
  )
}

const VIEWS: Record<Mode, () => React.JSX.Element> = { bsod: Bsod, hack: Hack, restart: Restart, shutdown: Shutdown, wordpress: WordPress }

export default function TakeoverLayer() {
  const mode = useTakeover((s) => s.mode)
  if (!mode) return null
  const View = VIEWS[mode]
  return <View />
}
