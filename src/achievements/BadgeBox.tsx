import { useState } from 'react'
import { rememberName, savedName } from '../leaderboard/api'
import { badgeBlob, badgeLines } from './badge'

const LINK = 'https://danishali.dev/'

async function shareFile(blob: Blob, text: string) {
  const file = new File([blob], 'danishali-dev-badge.png', { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: 'danishali.dev', text })
    return 'shared'
  }
  if (navigator.share) {
    await navigator.share({ title: 'danishali.dev', text, url: LINK })
    return 'shared'
  }
  await navigator.clipboard.writeText(LINK)
  return 'copied'
}

/** A downloadable card for a finished run, or for one achievement. */
export function BadgeBox({ when, title, detail }: { when: number; title: string; detail: string }) {
  const [name, setName] = useState(savedName)
  const [note, setNote] = useState('')
  const lines = () => badgeLines(name, new Date(when), title, detail)
  const run = async (mode: 'download' | 'share') => {
    try {
      if (name.trim()) rememberName(name.trim())
      const blob = await badgeBlob(lines())
      if (mode === 'download') {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'danishali-dev-badge.png'
        a.click()
        URL.revokeObjectURL(url)
        setNote('Saved.')
        return
      }
      setNote((await shareFile(blob, `${lines().who} · ${title}`)) === 'copied' ? 'Link copied.' : 'Shared.')
    } catch {
      setNote('Could not share that. The download still works.')
    }
  }
  return (
    <form
      className="np-badge"
      onSubmit={(e) => {
        e.preventDefault()
        void run('share')
      }}
    >
      <label>
        Name on the card
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="a visitor" autoComplete="nickname" />
      </label>
      <div className="np-badge-row">
        <button type="submit">Share</button>
        <button type="button" onClick={() => void run('download')}>
          Download
        </button>
        <button
          type="button"
          onClick={() =>
            navigator.clipboard.writeText(LINK).then(
              () => setNote('Link copied.'),
              () => setNote('Could not copy the link.'),
            )
          }
        >
          Copy link
        </button>
      </div>
      {note && <p className="np-badge-note">{note}</p>}
    </form>
  )
}
