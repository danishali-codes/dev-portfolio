import { useState, type FormEvent } from 'react'
import { t } from '../text'
import { Rich } from '../text/Rich'
import { formatMs, rememberName, savedName } from './api'
import { NAME_MAX, nameProblem, tidyName } from './names'
import { retryFinish, submitRun, useRun } from './achievementRun'
import { openTerminal } from '../shell/opener'
import { LEADERBOARD_COMMANDS } from './commands'

function showBoard() {
  openTerminal()
  LEADERBOARD_COMMANDS.scores.run(['achievements'], {} as Parameters<typeof LEADERBOARD_COMMANDS.scores.run>[1])
}

/** In the notepad once every achievement is found: put your time on the board. */
export default function AchBoard() {
  const { ranked, token, finish, ms, rank, error } = useRun()
  const [name, setName] = useState(savedName)
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)

  if (!ranked || !token) {
    return <p className="lb-ach-note">{t('windows.leaderboard.not-timed')}</p>
  }
  if (!finish) {
    return (
      <p className="lb-ach-note">
        {error ? t('windows.leaderboard.record-failed', { error }) : t('windows.leaderboard.recording')}
        {error && (
          <button type="button" className="lb-ach-link" onClick={() => void retryFinish()}>
            {t('windows.leaderboard.try-again')}
          </button>
        )}
      </p>
    )
  }
  if (rank !== null) {
    return (
      <p className="lb-ach-note">
        <Rich k="windows.leaderboard.your-rank" vars={{ rank }} />
        <button type="button" className="lb-ach-link" onClick={showBoard}>
          {t('windows.leaderboard.see-it')}
        </button>
      </p>
    )
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const clean = tidyName(name)
    const problem = nameProblem(clean)
    if (problem) return setMsg(problem)
    setSending(true)
    setMsg('')
    const r = await submitRun(clean)
    setSending(false)
    if (!r.ok) return setMsg(r.error)
    rememberName(clean)
  }

  return (
    <form className="lb-ach" onSubmit={submit}>
      <label htmlFor="lb-ach-name">
        <Rich k="windows.leaderboard.your-time" vars={{ time: formatMs(ms ?? 0) }} />
      </label>
      <div className="lb-ach-row">
        <input
          id="lb-ach-name"
          value={name}
          maxLength={NAME_MAX}
          autoComplete="nickname"
          spellCheck={false}
          onChange={(e) => setName(e.target.value)}
          disabled={sending}
        />
        <button type="submit" disabled={sending}>
          {sending ? '…' : t('windows.leaderboard.save')}
        </button>
      </div>
      {msg && <p className="lb-ach-msg">{msg}</p>}
    </form>
  )
}
