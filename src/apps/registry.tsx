import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { markRead } from '../achievements'
import type { Win } from '../store/windows'
import FolderView from './FolderView'
import Introduction from './Introduction'

const Terminal = lazy(() => import('./Terminal'))
const viewers = () => import('./Viewers')
const MarkdownView = lazy(() => viewers().then((m) => ({ default: m.MarkdownView })))
const ImageView = lazy(() => viewers().then((m) => ({ default: m.ImageView })))
const VideoView = lazy(() => viewers().then((m) => ({ default: m.VideoView })))
const PdfView = lazy(() => viewers().then((m) => ({ default: m.PdfView })))
const TextView = lazy(() => viewers().then((m) => ({ default: m.TextView })))
const AppFrame = lazy(() => viewers().then((m) => ({ default: m.AppFrame })))
const CvView = lazy(() => import('./CvView'))
const StatsView = lazy(() => import('./StatsView'))
const Guestbook = lazy(() => import('./Guestbook'))
const Updates = lazy(() => import('./Updates'))
const WallpaperPicker = lazy(() => import('./WallpaperPicker'))
const Ask = lazy(() => import('./Ask'))

function Loading({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div className="appframe-loading">Loading…</div>}>{children}</Suspense>
}

interface RenderOpts {
  onExit: () => void
  onNavigate: (path: string) => void
  phone?: boolean
}

export function WindowContent({ win, opts }: { win: Pick<Win, 'kind' | 'path' | 'url' | 'title'>; opts: RenderOpts }) {
  useEffect(() => {
    if (win.kind === 'markdown' && win.path) markRead(win.path)
  }, [win.kind, win.path])
  switch (win.kind) {
    case 'introduction':
      return <Introduction />
    case 'terminal':
      return (
        <Loading>
          <Terminal onExit={opts.onExit} showShortcuts={opts.phone} />
        </Loading>
      )
    case 'folder':
      return <FolderView path={win.path ?? '/'} onNavigate={opts.onNavigate} singleClick={opts.phone} />
    case 'markdown':
      return (
        <Loading>
          <MarkdownView path={win.path} />
        </Loading>
      )
    case 'image':
      return (
        <Loading>
          <ImageView key={win.path} path={win.path} />
        </Loading>
      )
    case 'video':
      return (
        <Loading>
          <VideoView path={win.path} />
        </Loading>
      )
    case 'pdf':
      return (
        <Loading>
          <PdfView path={win.path} />
        </Loading>
      )
    case 'wallpaper':
      return (
        <Loading>
          <WallpaperPicker />
        </Loading>
      )
    case 'stats':
      return (
        <Loading>
          <StatsView />
        </Loading>
      )
    case 'cv':
      return (
        <Loading>
          <CvView />
        </Loading>
      )
    case 'guestbook':
      return (
        <Loading>
          <Guestbook />
        </Loading>
      )
    case 'updates':
      return (
        <Loading>
          <Updates />
        </Loading>
      )
    case 'ask':
      return (
        <Loading>
          <Ask />
        </Loading>
      )
    case 'app':
      return (
        <Loading>
          <AppFrame url={win.url} title={win.title} />
        </Loading>
      )
    default:
      return (
        <Loading>
          <TextView path={win.path} />
        </Loading>
      )
  }
}
