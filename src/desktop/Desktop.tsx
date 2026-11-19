import DesktopNavigation from '../shell/DesktopNavigation'
import { t } from '../text'
import { useCallback, useEffect, useState } from 'react'
import { getNode, projects, TRASH_DIR } from '../fs'
import type { FsNode } from '../fs/types'
import { WindowContent } from '../apps/registry'
import { specFor } from '../apps/spec'
import { hasWallpaperPicker, openIntroduction, openGuestbook, openNode, openStats, openTerminal, openUpdates, openWallpaperPicker, registerOpener, registerWallpaperPicker, viewSource, WALLPAPER_SPEC } from '../shell/opener'
import { useTheme } from '../shell/theme'
import { topWindowId, useWindows } from '../store/windows'
import { useLayout } from '../store/layout'
import { useRestored } from '../shell/restored'
import Boot from './Boot'
import GuestNotes from './GuestNotes'
import Screensaver from './Screensaver'
import Wallpaper from './Wallpaper'
import { SkyStar } from '../achievements/SkyStar'
import Window from './Window'
import Taskbar from './Taskbar'
import ContextMenu from './ContextMenu'
import { DeskIcon, NowNote } from './DeskIcons'
import Spotlight from './Spotlight'
import WindowSwitcher from './WindowSwitcher'

export default function Desktop() {
  const { windows, open, close, update, fitAll, resetLayout } = useWindows()
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const [refreshing, setRefreshing] = useState(0)
  const [theme, setTheme] = useTheme()
  const closeMenu = useCallback(() => setMenu(null), [])
  const moved = useLayout((s) => Object.keys(s.offsets).length > 0)
  const resetIcons = useLayout((s) => s.reset)

  useEffect(() => {
    fitAll()
    window.addEventListener('resize', fitAll)
    return () => window.removeEventListener('resize', fitAll)
  }, [fitAll])

  useEffect(() => {
    registerOpener(
      (node: FsNode) => void open(specFor(node)),
      () => void open({ kind: 'terminal', title: t('desktop.titles.terminal') }),
      (spec) => void open(spec),
    )
    registerWallpaperPicker(() => void open(WALLPAPER_SPEC))
    return () => registerWallpaperPicker(undefined)
  }, [open])

  const top = topWindowId(windows)
  const about = getNode('/about.md')
  const cv = getNode('/cv.md')
  const trash = getNode(TRASH_DIR)
  const restored = useRestored((s) => s.paths)

  return (
    <div className="desktop">
      <DesktopNavigation />
      <Wallpaper />
      <SkyStar />
      <main
        className="workspace"
        onContextMenu={(e) => {
          // Windows keep the browser's own menu (copy, open link, …); the desktop gets ours.
          if ((e.target as HTMLElement).closest('.win, input, textarea, a')) return
          e.preventDefault()
          setMenu({ x: e.clientX, y: e.clientY })
        }}
      >
        <ul
          className={`desk-icons${refreshing ? ' refreshing' : ''}`}
          key={refreshing}
          aria-label={t('desktop.menu.label')}
          onAnimationEnd={() => setRefreshing(0)}
        >
          <DeskIcon node="introduction" label="welcome" onOpen={openIntroduction} />
          {projects().map((p) => (
            <DeskIcon key={p.path} node={p} label={p.name} onOpen={() => openNode(p)} />
          ))}
          <DeskIcon node="terminal" label="terminal" onOpen={openTerminal} />
          <DeskIcon node="stats" label="stats" onOpen={openStats} />
          {about && <DeskIcon node={about} label={t('desktop.icons.about')} onOpen={() => openNode(about)} />}
          {cv && <DeskIcon node={cv} label={t('desktop.icons.cv')} onOpen={() => openNode(cv)} />}
          <DeskIcon node="guestbook" label="guestbook" onOpen={openGuestbook} />
          {trash && <DeskIcon node={trash} label="trash" onOpen={() => openNode(trash)} />}
          {restored.map((path) => {
            const n = getNode(path)
            return n && <DeskIcon key={path} node={n} label={(n.type === "dir" && n.meta?.name) || n.name} onOpen={() => openNode(n)} />
          })}
        </ul>
        <NowNote />
        <GuestNotes />
        {windows.length === 0 && <p className="desk-hint">{t('desktop.hint')}</p>}
        {windows.map((w) => (
          <Window key={w.id} win={w} active={w.id === top}>
            <WindowContent
              win={w}
              opts={{
                onExit: () => close(w.id),
                onNavigate: (path) => {
                  const n = getNode(path)
                  if (n?.type === 'dir') update(w.id, { path, title: n.meta?.name ?? specFor(n).title, color: n.meta?.color ?? w.color })
                },
              }}
            />
          </Window>
        ))}
      </main>
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onClose={closeMenu}
          items={[
            { label: t('desktop.menu.refresh'), run: () => setRefreshing(Date.now()) },
            ...(windows.length
              ? [
                  { label: t('desktop.menu.tidy'), run: resetLayout },
                  { label: t('desktop.menu.close-all'), run: () => windows.forEach((w) => close(w.id)) },
                ]
              : []),
            ...(moved ? [{ label: t('desktop.menu.icons-back'), run: resetIcons }] : []),
            'sep',
            ...(hasWallpaperPicker() ? [{ label: t('desktop.menu.wallpaper'), run: openWallpaperPicker }] : []),
            { label: theme === 'dark' ? t('desktop.menu.to-light') : t('desktop.menu.to-dark'), run: () => setTheme(theme === 'dark' ? 'light' : 'dark') },
            'sep',
            { label: t('desktop.menu.terminal'), run: openTerminal },
            { label: t('desktop.menu.stats'), run: openStats },
            { label: t('desktop.menu.updates'), run: openUpdates },
            { label: t('desktop.menu.source'), hint: '↗', run: viewSource },
          ]}
        />
      )}
      <Taskbar windows={windows} />
      <Spotlight />
      <WindowSwitcher />
      <Screensaver />
      <Boot />
    </div>
  )
}
