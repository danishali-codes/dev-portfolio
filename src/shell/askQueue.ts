type Listener = (question: string) => void

const waiting: string[] = []
const listeners = new Set<Listener>()

/** Hand a question to the open chat, or hold it until the window mounts. */
export function pushAsk(question: string) {
  const text = question.trim()
  if (!text) return
  if (listeners.size === 0) {
    waiting.push(text)
    return
  }
  listeners.forEach((fn) => fn(text))
}

export function takeAsk(fn: Listener) {
  listeners.add(fn)
  const queued = waiting.splice(0)
  queued.forEach(fn)
  return () => void listeners.delete(fn)
}
