import DesktopNavigation from '../shell/DesktopNavigation'
import { useCallback, useEffect, useState } from 'react'
import { getNode, projects, TRASH_DIR } from '../fs'
import type { FsNode } from '../fs/types'
import { WindowContent } from '../apps/registry'
import { specFor } from '../apps/spec'
import { hasWallpaperPicker, openIntroduction, openGuestbook, openNode, openStats, openTerminal, openUpdates, openWallpaperPicker, registerOpener, registerWallpaperPicker, viewSource, WALLPAPER_SPEC } from '../shell/opener'
import { useTheme } from '../shell/theme'
import { topWindowId, useWindows } from '../store/windows'
import { useLayout } from '../store/layout'
import Boot from './Boot'
import GuestNotes from './GuestNotes'
import Screensaver from './Screensaver'
import Wallpaper from './Wallpaper'
import { SkyStar } from '../achievements/SkyStar'
import Window from './Window'
import Taskbar from './Taskbar'
import ContextMenu from './ContextMenu'
import { DeskIcon, NowNote } from './DeskIcons'

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
      () => void open({ kind: 'terminal', title: 'Terminal' }),
      (spec) => void open(spec),
    )
    registerWallpaperPicker(() => void open(WALLPAPER_SPEC))
    return () => registerWallpaperPicker(undefined)
  }, [open])

  const top = topWindowId(windows)
  const about = getNode('/about.md')
  const cv = getNode('/cv.md')
  const trash = getNode(TRASH_DIR)

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
          aria-label="Desktop"
          onAnimationEnd={() => setRefreshing(0)}
        >
          <DeskIcon node="introduction" label="welcome" onOpen={openIntroduction} />
          {projects().map((p) => (
            <DeskIcon key={p.path} node={p} label={p.name} onOpen={() => openNode(p)} />
          ))}
          <DeskIcon node="terminal" label="terminal" onOpen={openTerminal} />
          <DeskIcon node="stats" label="stats" onOpen={openStats} />
          {about && <DeskIcon node={about} label="about me" onOpen={() => openNode(about)} />}
          {cv && <DeskIcon node={cv} label="cv & contact" onOpen={() => openNode(cv)} />}
          <DeskIcon node="guestbook" label="guestbook" onOpen={openGuestbook} />
          {trash && <DeskIcon node={trash} label="trash" onOpen={() => openNode(trash)} />}
        </ul>
        <NowNote />
        <GuestNotes />
        {windows.length === 0 && <p className="desk-hint">Double-click a folder (or select it and press Enter) to open it. The dev/portfolio button opens the start menu.</p>}
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
            { label: 'Refresh', run: () => setRefreshing(Date.now()) },
            ...(windows.length
              ? [
                  { label: 'Tidy up windows', run: resetLayout },
                  { label: 'Close all windows', run: () => windows.forEach((w) => close(w.id)) },
                ]
              : []),
            ...(moved ? [{ label: 'Put icons and notes back', run: resetIcons }] : []),
            'sep',
            ...(hasWallpaperPicker() ? [{ label: 'Change wallpaper…', run: openWallpaperPicker }] : []),
            { label: theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode', run: () => setTheme(theme === 'dark' ? 'light' : 'dark') },
            'sep',
            { label: 'Open terminal', run: openTerminal },
            { label: 'Stats', run: openStats },
            { label: 'System updates', run: openUpdates },
            { label: 'View source', hint: '↗', run: viewSource },
          ]}
        />
      )}
      <Taskbar windows={windows} />
      <Screensaver />
      <Boot />
    </div>
  )
}
