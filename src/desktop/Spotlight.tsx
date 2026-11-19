import { useEffect, useMemo, useRef, useState } from 'react'
import { buildIndex, search, type SearchItem } from '../shell/search'
import { COMMANDS } from '../terminal/commands'
import { useTerm } from '../terminal/store'
import { openAsk, openGuestbook, openIntroduction, openNode, openStats, openTerminal, openUpdates, openWallpaperPicker } from '../shell/opener'
import { openCalendar } from './calendar'
import Icon from '../apps/Icon'

const KIND_LABEL: Record<SearchItem['kind'], string> = { project: 'Project', app: 'App', file: 'File', command: 'Command' }

const APP_OPENERS: Record<string, () => void> = {
  welcome: openIntroduction,
  terminal: openTerminal,
  stats: openStats,
  guestbook: openGuestbook,
  ask: () => openAsk(),
  wallpaper: openWallpaperPicker,
  updates: openUpdates,
  calendar: openCalendar,
}

/** Commands that make no sense to start from outside the terminal. */
const SKIP = new Set(['clear', 'exit', 'cd', 'pwd', 'echo'])

function activate(item: SearchItem) {
  if (item.node) return openNode(item.node)
  if (item.kind === 'app' && item.id) return APP_OPENERS[item.id]?.()
  if (item.kind === 'command' && item.id) {
    useTerm.getState().queue(item.id)
    openTerminal()
  }
}

/** Ctrl+K (or ⌘K): one box that finds projects, files, apps and terminal commands. */
export default function Spotlight() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const index = useMemo(
    () => buildIndex(Object.entries(COMMANDS).filter(([n, c]) => !c.hidden && !SKIP.has(n)).map(([name, c]) => ({ name, desc: c.desc }))),
    [],
  )
  const hits = useMemo(() => search(index, q), [index, q])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => {
          if (!o) opener.current = document.activeElement as HTMLElement | null
          return !o
        })
      }
    }
    const show = () => {
      opener.current = document.activeElement as HTMLElement | null
      setOpen(true)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('paperos:spotlight', show)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('paperos:spotlight', show)
    }
  }, [])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  if (!open) return null

  const close = (restore = true) => {
    setOpen(false)
    setQ('')
    setSel(0)
    if (restore) opener.current?.focus?.({ preventScroll: true })
  }
  const choose = (item: SearchItem | undefined) => {
    if (!item) return
    close(false)
    activate(item)
  }

  return (
    <div className="spotlight-scrim" onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <div className="spotlight" role="dialog" aria-modal="true" aria-label="Search everything">
        <label className="spotlight-field">
          <span aria-hidden="true">⌕</span>
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={hits.length > 0}
            aria-controls="spotlight-list"
            aria-activedescendant={hits[sel] ? `spot-${sel}` : undefined}
            aria-label="Search projects, files, apps and commands"
            placeholder="Search projects, files, apps and commands"
            value={q}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => {
              setQ(e.target.value)
              setSel(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') return close()
              if (e.key === 'Enter') return choose(hits[sel])
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault()
                if (!hits.length) return
                setSel((s) => (s + (e.key === 'ArrowDown' ? 1 : -1) + hits.length) % hits.length)
              }
            }}
          />
          <kbd>esc</kbd>
        </label>
        {q.trim() && (
          <ul className="spotlight-list" id="spotlight-list" role="listbox" aria-label="Results">
            {hits.length === 0 && <li className="spotlight-none">Nothing matches “{q.trim()}”. Try a project name, a file or a command like “ls”.</li>}
            {hits.map((item, i) => (
              <li
                key={`${item.kind}:${item.node?.path ?? item.id ?? item.label}`}
                id={`spot-${i}`}
                role="option"
                aria-selected={i === sel}
                className={i === sel ? 'on' : undefined}
                onPointerMove={() => setSel(i)}
                onClick={() => choose(item)}
                style={{ ['--ic-color' as string]: item.color }}
              >
                {item.node ? <Icon node={item.node} size="sm" color={item.color} /> : item.kind === 'command' ? <span className="spot-glyph" aria-hidden="true">&gt;_</span> : <span className="sm-swatch" />}
                <span className="spot-label">{item.label}</span>
                {item.detail && <span className="spot-detail">{item.detail}</span>}
                <span className="spot-kind">{KIND_LABEL[item.kind]}</span>
              </li>
            ))}
          </ul>
        )}
        {!q.trim() && <p className="spotlight-hint">↑↓ to move, Enter to open. Commands run in the terminal.</p>}
      </div>
    </div>
  )
}
