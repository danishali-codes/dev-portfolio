import { useEffect, useState } from 'react'
import { t } from '../text'
import Draggable from './Draggable'
import { pickNotes } from './guestNotes'

interface Note {
  id: string
  name: string
  message: string
}

const CLOSED = 'devportfolio.notes-closed'

function closedIds(): string[] {
  try {
    const raw = JSON.parse(sessionStorage.getItem(CLOSED) ?? '[]')
    return Array.isArray(raw) ? raw.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

/** A few approved guestbook notes, stuck on the desktop. Phone mode never mounts this. */
export default function GuestNotes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [closed, setClosed] = useState<string[]>(closedIds)

  useEffect(() => {
    let live = true
    fetch('/api/guestbook')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { notes?: Note[] }) => {
        if (live) setNotes(Array.isArray(d.notes) ? d.notes : [])
      })
      .catch(() => live && setNotes([]))
    return () => {
      live = false
    }
  }, [])

  const shown = pickNotes(notes, closed, Math.floor(Date.now() / 86_400_000))
  if (!shown.length) return null
  const close = (id: string) => {
    const next = [...closed, id]
    setClosed(next)
    try {
      sessionStorage.setItem(CLOSED, JSON.stringify(next))
    } catch {
      /* closing still works for this render */
    }
  }
  return (
    <>
      {shown.map((note, i) => (
        <Draggable key={note.id} as="aside" id={`guest-note-${note.id}`} className={`guest-note guest-note-${i}`} aria-label={t('desktop.guest-note.label', { name: note.name })}>
          <button type="button" className="guest-note-x" onClick={() => close(note.id)} aria-label={t('desktop.guest-note.close', { name: note.name })}>
            ×
          </button>
          <p>{note.message}</p>
          <footer>{note.name}</footer>
        </Draggable>
      ))}
    </>
  )
}
