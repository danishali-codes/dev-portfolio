import { useEffect, useRef, useState, type FormEvent } from 'react'
import { takeAsk } from '../shell/askQueue'

interface Msg {
  role: 'you' | 'danish'
  text: string
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
      const data = (await res.json().catch(() => ({}))) as { answer?: string; error?: string }
      const reply = data.answer || data.error || "I don't know."
      setMessages((m) => [...m, { role: 'danish', text: reply }])
    } catch {
      setMessages((m) => [...m, { role: 'danish', text: "I couldn't get an answer just now." }])
    } finally {
      busyRef.current = false
      setBusy(false)
      const next = pending.current.shift()
      if (next) void send(next)
    }
  }

  useEffect(() => takeAsk((q) => void send(q)), [])

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [messages, busy])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void send(question)
  }

  return (
    <div className="ask">
      <p className="ask-lead">Questions about the projects. If it isn't in the notes, the answer is "I don't know."</p>
      <div className="ask-log" role="log" aria-live="polite">
        {messages.map((m, i) => (
          <p key={i} className={m.role === 'you' ? 'ask-you' : 'ask-danish'}>
            <b>{m.role === 'you' ? 'You' : 'Danish'}</b> {m.text}
          </p>
        ))}
        {busy && <p className="ask-danish">Thinking…</p>}
        <div ref={end} />
      </div>
      <form className="ask-form" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="ask-q">
          Question
        </label>
        <input id="ask-q" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={MAX} placeholder="What is Fuloos?" disabled={busy} />
        <button type="submit" className="pill pill-dark" disabled={busy || !question.trim()}>
          Ask
        </button>
      </form>
    </div>
  )
}
