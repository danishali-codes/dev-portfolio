import { useCallback, useEffect, useRef, useState } from 'react'
import Calendar from './Calendar'
import { allProjects, getNode, projects } from '../fs'
import type { DirNode, FsNode } from '../fs/types'
import { openIntroduction, openAsk, openGuestbook, openNode, openStats, openTerminal, openWallpaperPicker } from '../shell/opener'
import { useTheme } from '../shell/theme'
import { topWindowId, useWindows, type Win } from '../store/windows'
import { Star } from '../achievements/Notepad'
import { restart, shutdown } from '../achievements/effects'
import { setResume } from '../shell/plain'
import { useSound } from '../shell/sound'
import { loadOnline } from '../shell/visit'

const GITHUB = 'https://github.com/danishali-codes'

function Clock() {
  const [now, setNow] = useState(() => new Date())
  const [cal, setCal] = useState(false)
  const close = useCallback(() => setCal(false), [])
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000)
    const show = () => setCal(true)
    window.addEventListener('paperos:calendar', show)
    return () => {
      clearInterval(t)
      window.removeEventListener('paperos:calendar', show)
    }
  }, [])
  return (
    <>
      {cal && <Calendar onClose={close} />}
      <button type="button" className="tb-clock" onClick={() => setCal(!cal)} aria-expanded={cal} aria-haspopup="dialog" aria-label={`${now.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}. Open calendar`}>
        <time dateTime={now.toISOString()}>{now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</time>
        <span className="tb-date">{now.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
      </button>
    </>
  )
}

/** "3 here now", when other people have the site open too. Hidden when it's just you or the count is unknown. */
function Online() {
  const [n, setN] = useState<number | null>(null)
  useEffect(() => {
    let alive = true
    const check = () => void loadOnline().then((v) => alive && setN(v))
    check()
    const t = setInterval(() => document.visibilityState === 'visible' && check(), 60_000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [])
  if (n == null || n < 2) return null
  return (
    <span className="tb-online" title="Tabs open on this site in the last two minutes">
      <span className="tb-online-dot" aria-hidden="true" />
      {n} here now
    </span>
  )
}

function SoundToggle() {
  const [on, setOn] = useSound()
  return (
    <button type="button" className="tb-theme tb-sound" onClick={() => setOn(!on)} aria-pressed={on} aria-label={on ? 'Turn sounds off' : 'Turn sounds on'} title={on ? 'Sounds on' : 'Sounds off'}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
        {on ? <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /> : <path d="M17 9l5 6M22 9l-5 6" />}
      </svg>
    </button>
  )
}

function StartMenu({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const about = getNode('/about.md')
  const cv = getNode('/cv.md')
  // Move focus into the menu, and give it back to the start button when it closes.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const menu = ref.current
    menu?.querySelector<HTMLElement>('button, a')?.focus()
    return () => {
      const now = document.activeElement
      if (!now || now === document.body || menu?.contains(now)) opener?.focus()
    }
  }, [])
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node) && !(e.target as HTMLElement).closest('.tb-start')) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onClose()
      // Up/down arrows walk the menu like a native one.
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
      const items = [...(ref.current?.querySelectorAll<HTMLElement>('button, a') ?? [])]
      const at = items.indexOf(document.activeElement as HTMLElement)
      if (at === -1 && !ref.current?.contains(document.activeElement)) return
      e.preventDefault()
      const next = e.key === 'ArrowDown' ? (at + 1) % items.length : (at - 1 + items.length) % items.length
      items[next]?.focus()
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])
  const go = (n: FsNode) => {
    openNode(n)
    onClose()
  }
  return (
    <div className="start-menu" id="start-menu" ref={ref} role="dialog" aria-label="Start menu">
      <div className="sm-profile">
        <span className="sm-avatar" aria-hidden="true">
          da
        </span>
        <div>
          <div className="sm-name">Danish Ali</div>
          <div className="sm-sub">Apps, games and the odd homelab tool</div>
        </div>
        <Star id="star-menu" className="star-menu" />
      </div>
      <div className="sm-label">PROJECTS</div>
      <ul className="sm-list">
        {projects().map((p) => (
          <li key={p.path}>
            <button type="button" onClick={() => go(p)} style={{ ['--ic-color' as string]: p.meta?.color }}>
              <span className="sm-swatch" />
              {p.meta?.name ?? p.name}
              <span className="sm-year">{p.meta?.year}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="sm-actions">
        <button type="button" className="pill" onClick={() => (openIntroduction(), onClose())}>Welcome</button>
        {about && (
          <button type="button" className="pill pill-dark" onClick={() => go(about)}>
            About me
          </button>
        )}
        {cv && (
          <button type="button" className="pill" onClick={() => go(cv)}>
            CV & contact
          </button>
        )}
        <button type="button" className="pill" onClick={() => (openTerminal(), onClose())}>
          Terminal
        </button>
        <button type="button" className="pill" onClick={() => (openWallpaperPicker(), onClose())}>
          Wallpaper
        </button>
        <button type="button" className="pill" onClick={() => (openStats(), onClose())}>
          Stats
        </button>
        <button type="button" className="pill" onClick={() => (openGuestbook(), onClose())}>
          Guestbook
        </button>
        <button type="button" className="pill" onClick={() => (openAsk(), onClose())}>
          Ask Danish
        </button>
        <a className="pill" href={GITHUB} target="_blank" rel="noreferrer">
          GitHub
        </a>
      </div>
      <div className="sm-power">
        <button type="button" onClick={() => (onClose(), restart())}>
          <span aria-hidden="true">↻</span> Restart
        </button>
        <button type="button" onClick={() => (onClose(), shutdown())}>
          <span aria-hidden="true">⏻</span> Shut down
        </button>
      </div>
    </div>
  )
}

function Search() {
  const [q, setQ] = useState('')
  const hits = q.trim()
    ? allProjects().filter((p) =>
        [p.name, p.meta?.name, p.meta?.tagline, ...(p.meta?.stack ?? [])].join(' ').toLowerCase().includes(q.trim().toLowerCase()),
      )
    : []
  const open = (p: DirNode) => {
    openNode(p)
    setQ('')
  }
  return (
    <div className="tb-search-wrap" role="search">
      <label className="tb-search" htmlFor="tb-search">
        <span aria-hidden="true">⌕</span>
        <input
          id="tb-search"
          type="search"
          placeholder="Search projects"
          aria-label="Search projects"
          aria-controls={q.trim() ? 'tb-results' : undefined}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && hits[0]) open(hits[0])
            if (e.key === 'Escape') setQ('')
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              document.querySelector<HTMLElement>('#tb-results button')?.focus()
            }
          }}
          autoComplete="off"
        />
        <button type="button" className="tb-kbd" onClick={() => window.dispatchEvent(new Event('paperos:spotlight'))} title="Search everything (Ctrl+K)" aria-label="Search everything (Ctrl+K)">
          {/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl K'}
        </button>
      </label>
      {q.trim() && (
        <ul
          className="tb-results"
          id="tb-results"
          aria-label="Matching projects"
          onKeyDown={(e) => {
            const items = [...e.currentTarget.querySelectorAll<HTMLElement>('button')]
            const at = items.indexOf(document.activeElement as HTMLElement)
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault()
              const next = at + (e.key === 'ArrowDown' ? 1 : -1)
              ;(next < 0 ? document.getElementById('tb-search') : items[Math.min(next, items.length - 1)])?.focus()
            }
            if (e.key === 'Escape') {
              setQ('')
              document.getElementById('tb-search')?.focus()
            }
          }}
        >
          {hits.length === 0 && <li className="tb-none">No projects match “{q.trim()}”</li>}
          {hits.map((p) => (
            <li key={p.path}>
              <button type="button" onClick={() => open(p)} style={{ ['--ic-color' as string]: p.meta?.color }}>
                <span className="sm-swatch" />
                <span>{p.meta?.name ?? p.name}</span>
                <span className="tb-tagline">{p.meta?.tagline}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function Taskbar({ windows }: { windows: Win[] }) {
  const { focus, minimize } = useWindows()
  const [theme, setTheme] = useTheme()
  const [start, setStart] = useState(false)
  const top = topWindowId(windows)
  return (
    <>
      {start && <StartMenu onClose={() => setStart(false)} />}
      <nav className="taskbar" aria-label="Taskbar">
        <button
          type="button"
          className="tb-start"
          aria-expanded={start}
          aria-haspopup="dialog"
          aria-controls={start ? 'start-menu' : undefined}
          onClick={() => setStart(!start)}
        >
          <span className="sm-avatar sm-avatar-sm" aria-hidden="true">
            da
          </span>
          dev/portfolio
        </button>
        <Search />
        <span className="tb-sep" aria-hidden="true" />
        <div className="tb-windows" role="group" aria-label="Open windows">
          {windows.map((w) => (
            <button
              key={w.id}
              type="button"
              className={`tb-win${w.minimized ? ' min' : ''}${w.id === top ? ' on' : ''}`}
              onClick={() => (w.id === top && !w.minimized ? minimize(w.id) : focus(w.id))}
              title={w.minimized ? `${w.title} (minimised)` : w.title}
              aria-pressed={w.id === top && !w.minimized}
              aria-label={w.minimized ? `${w.title}, minimised` : w.title}
              style={{ ['--ic-color' as string]: w.color }}
            >
              <span className={`win-glyph win-glyph-${w.kind}`} aria-hidden="true" />
              <span className="tb-win-title">{w.title}</span>
            </button>
          ))}
        </div>
        <Online />
        <button type="button" className="tb-resume" onClick={() => setResume(true)}>
          Resume
        </button>
        <button
          type="button"
          className="tb-theme"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
        <SoundToggle />
        <Clock />
      </nav>
    </>
  )
}
