import CopyLink from '../apps/CopyLink'
import { t } from '../text'
import { initialiseHistory, notFoundSpec, specFromUrl, syncNavigation } from '../shell/navigation'
import { useEffect, useRef, useState } from 'react'
import { findReadme, getNode, projects, TRASH_DIR } from '../fs'
import type { DirNode, FsNode } from '../fs/types'
import Icon from '../apps/Icon'
import { WindowContent } from '../apps/registry'
import { specFor } from '../apps/spec'
import { GUESTBOOK, INTRODUCTION, registerOpener, registerWallpaperPicker, STATS, WALLPAPER_SPEC } from '../shell/opener'
import Boot from '../desktop/Boot'
import Draggable from '../desktop/Draggable'
import Wallpaper from '../desktop/Wallpaper'
import type { OpenSpec } from '../store/windows'
import { useLayout } from '../store/layout'
import { SkyStar } from '../achievements/SkyStar'
import { Star } from '../achievements/Notepad'

function StatusBar() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="ph-status" aria-hidden="true">
      <span>{now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
      <span>{t('phone.status')}</span>
    </div>
  )
}

/** A tapped project opens its write-up; a collection (Games, University) opens its folder of projects. */
function landingFor(p: DirNode): FsNode {
  const collection = p.children.some((c) => c.type === 'dir' && c.meta)
  return collection ? p : findReadme(p) ?? p
}

/** Phone UI: a home screen of app icons; every app opens full screen. */
export default function Phone() {
  const [stack, setStack] = useState<OpenSpec[]>(() => {
    const spec = specFromUrl() ?? notFoundSpec()
    return spec ? [spec] : []
  })

  useEffect(() => {
    initialiseHistory()
    const restore = () => {
      const spec = specFromUrl() ?? notFoundSpec()
      setStack(spec ? [spec] : [])
    }
    window.addEventListener('popstate', restore)
    return () => window.removeEventListener('popstate', restore)
  }, [])

  useEffect(() => {
    registerOpener(
      (node: FsNode) => setStack((s) => [...s, specFor(node)]),
      () => setStack((s) => [...s, { kind: 'terminal', title: t('desktop.titles.terminal') }]),
      (spec) => setStack((s) => [...s, spec]),
    )
    registerWallpaperPicker(() => setStack((s) => [...s, WALLPAPER_SPEC]))
    // After the blue screen or the hack: back to the home screen.
    const home = () => setStack([])
    window.addEventListener('paperos:home', home)
    return () => {
      registerWallpaperPicker(undefined)
      window.removeEventListener('paperos:home', home)
    }
  }, [])

  // Screen readers and keyboards land on the new screen's title, like a page change.
  const titleRef = useRef<HTMLHeadingElement>(null)
  const depth = stack.length
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    titleRef.current?.focus({ preventScroll: true })
  }, [depth])

  const back = () => history.state?.paperosIndex > 0 ? history.back() : setStack((s) => s.slice(0, -1))
  const current = stack[stack.length - 1]
  useEffect(() => { syncNavigation(current) }, [current])
  const about = getNode('/about.md')
  const now = getNode('/now.md')
  const cv = getNode('/cv.md')
  const files = getNode('/projects')
  const trash = getNode(TRASH_DIR)
  const open = (spec: OpenSpec) => setStack((s) => [...s, spec])
  const moved = useLayout((s) => Object.keys(s.offsets).some((id) => id.startsWith('app:')))
  const resetIcons = () => {
    const { offsets, setOffset } = useLayout.getState()
    for (const id of Object.keys(offsets)) if (id.startsWith('app:')) setOffset(id, { x: 0, y: 0 })
  }

  return (
    <div className="phone">
      <Wallpaper compact />
      {!current && <SkyStar />}
      <StatusBar />
      <Boot />
      {current ? (
        <main className="ph-app">
          <header className="ph-app-bar" style={{ ['--ic-color' as string]: current.color }}>
            <button type="button" className="round-btn" onClick={back} aria-label={t('phone.back')}>
              ‹
            </button>
            <h1 className="ph-app-title" ref={titleRef} tabIndex={-1}>
              {current.title}
            </h1>
            <div className="ph-app-actions"><CopyLink spec={current} /><button type="button" className="ph-home-btn" onClick={() => setStack([])}>
              {t('phone.home')}
            </button></div>
          </header>
          <div className="ph-app-body">
            <WindowContent
              win={current}
              opts={{
                phone: true,
                onExit: back,
                onNavigate: (path) => {
                  const n = getNode(path)
                  if (n) open(specFor(n))
                },
              }}
            />
          </div>
        </main>
      ) : (
        <main className="ph-home">
          <div className="ph-hello">
            <div className="ph-kicker">{t('phone.kicker')}</div>
            <h1 ref={titleRef} tabIndex={-1}>{t('phone.title')}</h1>
            <p>{t('phone.tagline')}</p>
            {moved && (
              <button type="button" className="pill ph-reset" onClick={resetIcons}>
                {t('phone.reset')}
              </button>
            )}
          </div>
          <ul className="ph-grid">
            <Draggable as="li" id="app:welcome" stack>
              <button type="button" onClick={() => open(INTRODUCTION)}>
                <Icon node="introduction" size="xl" />
                <span>{t('phone.apps.welcome')}</span>
              </button>
            </Draggable>
            {projects().map((p) => (
              <Draggable as="li" key={p.path} id={`app:${p.name}`} stack>
                <button type="button" onClick={() => open(specFor(landingFor(p)))}>
                  <span className="ic ic-xl ic-tile ic-app" style={{ ['--ic-color' as string]: p.meta?.color }} aria-hidden="true">
                    {(p.meta?.name ?? p.name).slice(0, 1).toUpperCase()}
                  </span>
                  <span>{p.meta?.name ?? p.name}</span>
                </button>
              </Draggable>
            ))}
            {about && (
              <Draggable as="li" id="app:about" stack>
                <button type="button" onClick={() => open(specFor(about))}>
                  <span className="ic ic-xl ic-tile ic-about" aria-hidden="true">
                    {t('desktop.initials')}
                  </span>
                  <span>{t('phone.apps.about')}</span>
                </button>
              </Draggable>
            )}
            <Draggable as="li" id="app:wallpaper" stack>
              <button type="button" onClick={() => open(WALLPAPER_SPEC)}>
                <span className="ic ic-xl ic-tile ic-wallpaper" aria-hidden="true" />
                <span>{t('phone.apps.wallpaper')}</span>
              </button>
            </Draggable>
            <Draggable as="li" id="app:stats" stack>
              <button type="button" onClick={() => open(STATS)}>
                <Icon node="stats" size="xl" />
                <span>{t('phone.apps.stats')}</span>
              </button>
            </Draggable>
            {now && (
              <Draggable as="li" id="app:now" stack>
                <button type="button" onClick={() => open(specFor(now))}>
                  <span className="ic ic-xl ic-tile ic-now" aria-hidden="true">
                    {t('phone.apps.now-icon')}
                  </span>
                  <span>{t('phone.apps.now')}</span>
                </button>
              </Draggable>
            )}
            {cv && (
              <Draggable as="li" id="app:cv" stack>
                <button type="button" onClick={() => open(specFor(cv))}>
                  <Icon node={cv} size="xl" />
                  <span>{t('phone.apps.cv')}</span>
                </button>
              </Draggable>
            )}
            <Draggable as="li" id="app:guestbook" stack>
              <button type="button" onClick={() => open(GUESTBOOK)}>
                <span className="ic ic-xl ic-tile ic-guestbook" aria-hidden="true">
                  ✎
                </span>
                <span>{t('phone.apps.guestbook')}</span>
              </button>
            </Draggable>
            {trash && (
              <Draggable as="li" id="app:trash" stack>
                <button type="button" onClick={() => open(specFor(trash))}>
                  <Icon node={trash} size="xl" />
                  <span>{t('phone.apps.trash')}</span>
                </button>
              </Draggable>
            )}
          </ul>
          <nav className="ph-dock" aria-label={t('phone.dock')}>
            <Star id="star-menu" className="star-dock" />
            <button type="button" onClick={() => open({ kind: 'terminal', title: t('desktop.titles.terminal') })}>
              <Icon node="terminal" size="lg" />
              <span>{t('phone.apps.terminal')}</span>
            </button>
            {files && (
              <button type="button" onClick={() => open(specFor(files))}>
                <Icon node={files} size="lg" color="var(--btn-min)" />
                <span>{t('phone.apps.files')}</span>
              </button>
            )}
            <a href="https://github.com/danishali-codes" target="_blank" rel="noreferrer">
              <span className="ic ic-lg ic-tile ic-contact" aria-hidden="true">
                @
              </span>
              <span>{t('phone.apps.github')}</span>
            </a>
          </nav>
        </main>
      )}
    </div>
  )
}

