import { useEffect, useRef, useState } from 'react'
import { getNode } from '../fs'
import type { DirNode, FileNode, FsNode } from '../fs/types'
import { openNode } from '../shell/opener'
import Icon from './Icon'
import { requestSlideshow } from './slideshow'

const isMedia = (c: FsNode): c is FileNode => c.type === 'file' && (c.kind === 'image' || c.kind === 'video')

/** Folders that are mostly screenshots and videos open as a grid of pictures. */
function isGalleryFolder(dir: DirNode) {
  const media = dir.children.filter(isMedia).length
  return media >= 3 && media >= dir.children.length * 0.6
}

function Gallery({ dir }: { dir: DirNode }) {
  const media = dir.children.filter(isMedia)
  const images = media.filter((m) => m.kind === 'image')
  return (
    <>
      <ul className="gallery" aria-label={`Pictures in ${dir.name}`}>
        {media.map((m) => (
          <li key={m.path}>
            <button type="button" className="gallery-item" onClick={() => openNode(m)} aria-label={`${m.kind === 'video' ? 'Play' : 'Open'} ${m.name}`}>
              {m.kind === 'image' ? (
                <img src={m.src} alt="" loading="lazy" decoding="async" width={m.width} height={m.height} />
              ) : m.poster ? (
                <img src={m.poster} alt="" loading="lazy" decoding="async" />
              ) : (
                <span className="gallery-video" aria-hidden="true" />
              )}
              {m.kind === 'video' && <span className="gallery-play" aria-hidden="true">▶</span>}
              <span className="gallery-name">{m.name}</span>
            </button>
          </li>
        ))}
      </ul>
      {images.length > 1 && (
        <div className="gallery-bar">
          <button
            type="button"
            className="pill"
            onClick={() => {
              requestSlideshow()
              openNode(images[0])
            }}
          >
            ▶ Slideshow
          </button>
        </div>
      )}
    </>
  )
}

interface Props {
  path: string
  /** Navigate inside the same window instead of opening a new one. */
  onNavigate: (path: string) => void
  /** Phones open on a single tap. */
  singleClick?: boolean
}

export default function FolderView({ path, onNavigate, singleClick = false }: Props) {
  const gridRef = useRef<HTMLUListElement>(null)
  const shown = useRef(path)
  // Moving to another folder replaces the button that had focus, so put focus on the new listing.
  useEffect(() => {
    if (shown.current === path) return
    shown.current = path
    const host = gridRef.current?.closest('.win, .ph-app')
    if (host?.contains(document.activeElement) || document.activeElement === document.body) {
      gridRef.current?.querySelector<HTMLElement>('.file')?.focus({ preventScroll: true })
    }
  }, [path])
  const node = getNode(path)
  // Each folder remembers icons or pictures for as long as the window is open.
  const [views, setViews] = useState<Record<string, 'icons' | 'gallery'>>({})
  if (!node || node.type !== 'dir') return <p className="missing">This folder no longer exists.</p>
  const parent = path === '/' ? null : path.slice(0, path.lastIndexOf('/')) || '/'
  const parts = path.split('/').filter(Boolean)
  const meta = node.meta

  const canGallery = isGalleryFolder(node)
  const view = views[path] ?? (canGallery ? 'gallery' : 'icons')
  const activate = (child: FsNode) => (child.type === 'dir' ? onNavigate(child.path) : openNode(child))

  return (
    <div className="folder">
      <nav className="folder-bar" aria-label="Folder path">
        <button type="button" className="round-btn" disabled={!parent} onClick={() => parent && onNavigate(parent)} aria-label="Back">
          ‹
        </button>
        <button type="button" className={`crumb${parts.length === 0 ? ' here' : ''}`} onClick={() => onNavigate('/')}>
          home
        </button>
        {parts.map((part, i) => {
          const p = '/' + parts.slice(0, i + 1).join('/')
          const here = i === parts.length - 1
          const n = getNode(p)
          const color = n?.type === 'dir' ? n.meta?.color : undefined
          return (
            <span key={p} className="crumb-wrap">
              <span className="crumb-sep" aria-hidden="true">
                ›
              </span>
              <button type="button" className={`crumb${here ? ' here' : ''}`} style={{ ['--ic-color' as string]: color }} onClick={() => onNavigate(p)} aria-current={here ? 'page' : undefined}>
                {part}
              </button>
            </span>
          )
        })}
        {canGallery && (
          <button
            type="button"
            className="pill folder-view-btn"
            onClick={() => setViews({ ...views, [path]: view === 'gallery' ? 'icons' : 'gallery' })}
            aria-pressed={view === 'gallery'}
          >
            {view === 'gallery' ? 'Show as icons' : 'Show pictures'}
          </button>
        )}
      </nav>
      {meta?.tagline && (
        <p className="folder-meta">
          <strong>{meta.name}</strong> {meta.tagline}
        </p>
      )}
      {view === 'gallery' ? <Gallery dir={node} /> : <ul className="folder-grid" ref={gridRef} aria-label={`Files in ${parts[parts.length - 1] ?? 'home'}`}>
        {node.children.filter((c) => c.name !== 'project.json').map((c) => (
          <li key={c.path}>
            <button
              type="button"
              className="file"
              onDoubleClick={() => activate(c)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  activate(c)
                }
              }}
              onClick={(e) => {
                // Touch screens have no double-click, so a tap opens.
                if (singleClick || (e.nativeEvent as PointerEvent).pointerType === 'touch') activate(c)
              }}
            >
              <Icon node={c} color={meta?.color} />
              <span className="file-name">{c.type === 'dir' ? (c.meta?.name ?? c.name) : c.kind === 'app' ? `${c.title ?? c.name} app` : c.name}</span>
            </button>
          </li>
        ))}
      </ul>}
    </div>
  )
}
