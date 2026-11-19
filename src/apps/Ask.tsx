import { useEffect, useRef, useState, type FormEvent } from 'react'
import { t } from '../text'
import { takeAsk } from '../shell/askQueue'

interface Msg {
  role: 'you' | 'danish'
  text: string
  /** The model that wrote this answer, shown under it. */
  model?: string
}

const MAX = 500

/** A short chat grounded in the public notes. Loaded only when the window opens. */
export default function Ask() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const pending = useRef<string[]>([])
  const end = useRef<HTMLDivElement>(null)

  const send = async (text: string) => {
    const q = text.trim().slice(0, MAX)
    if (!q) return
    if (busyRef.current) {
      pending.current.push(q)
      return
    }
    busyRef.current = true
    setBusy(true)
    setQuestion('')
    setMessages((m) => [...m, { role: 'you', text: q }])
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      })
      const data = (await res.json().catch(() => ({}))) as { answer?: string; error?: string; model?: string }
      const reply = data.answer || data.error || t('windows.ask.dont-know')
      setMessages((m) => [...m, { role: 'danish', text: reply, model: data.answer ? data.model : undefined }])
    } catch {
      setMessages((m) => [...m, { role: 'danish', text: t('windows.ask.failed') }])
    } finally {
      busyRef.current = false
      setBusy(false)
      const next = pending.current.shift()
      if (next) void send(next)
    }
  }

  const sendRef = useRef(send)
  sendRef.current = send
  useEffect(() => takeAsk((q) => void sendRef.current(q)), [])

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [messages, busy])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void send(question)
  }

  return (
    <div className="ask">
      <p className="ask-lead">{t('windows.ask.lead')}</p>
      <div className="ask-log" role="log" aria-live="polite">
        {messages.map((m, i) => (
          <p key={i} className={m.role === 'you' ? 'ask-you' : 'ask-danish'}>
            <b>{m.role === 'you' ? t('windows.ask.you') : t('windows.ask.danish')}</b> {m.text}
            {m.model && <small className="ask-model">{t('windows.ask.model', { model: m.model })}</small>}
          </p>
        ))}
        {busy && <p className="ask-danish">{t('windows.ask.thinking')}</p>}
        <div ref={end} />
      </div>
      <form className="ask-form" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="ask-q">
          {t('windows.ask.question')}
        </label>
        <input id="ask-q" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={MAX} placeholder={t('windows.ask.placeholder')} disabled={busy} />
        <button type="submit" className="pill pill-dark" disabled={busy || !question.trim()}>
          {t('windows.ask.ask')}
        </button>
      </form>
    </div>
  )
}
